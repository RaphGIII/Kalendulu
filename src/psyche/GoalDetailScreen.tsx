import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import {
  GoalExecutionPlan,
  PlannerExecutionStep,
  PsycheGoal,
} from './types';
import { loadPsycheGoals, savePsycheGoals } from './storage';
import { applyFullGoalPlan } from './adapters';
import { GOLD, PSYCHE_THEME } from './styles';

dayjs.locale('de');

type Props = {
  route?: {
    params?: {
      goalId?: string;
    };
  };
  navigation?: {
    goBack?: () => void;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function checklistProgress(steps: PlannerExecutionStep[]) {
  const allItems = steps.flatMap((step) => step.checklist ?? []);
  if (!allItems.length) return 0;
  const done = allItems.filter((item) => item.done).length;
  return Math.round((done / allItems.length) * 100);
}

function isStepDone(step: PlannerExecutionStep) {
  return (step.checklist ?? []).length > 0 && (step.checklist ?? []).every((item) => item.done);
}

function currentStepNumber(steps: PlannerExecutionStep[]) {
  const index = steps.findIndex((step) => !isStepDone(step));
  if (index < 0) return steps.length;
  return index + 1;
}

function formatDateTime(iso?: string) {
  if (!iso) return 'Kein Termin';
  const d = dayjs(iso);
  if (!d.isValid()) return 'Kein Termin';
  return d.format('dd, DD.MM. · HH:mm');
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamp(value, 0, 100)}%` }]} />
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

export default function GoalDetailScreen({ route, navigation }: Props) {
  const goalId = route?.params?.goalId;

  const [goal, setGoal] = useState<PsycheGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'idle' | 'applying'>('idle');

  useEffect(() => {
    (async () => {
      const goals = await loadPsycheGoals();
      const found = goals.find((item) => item.id === goalId) ?? null;
      setGoal(found);
      setLoading(false);
    })();
  }, [goalId]);

  const executionPlan: GoalExecutionPlan | null = goal?.executionPlan ?? null;
  const steps = useMemo(() => executionPlan?.steps ?? [], [executionPlan]);
  const progress = useMemo(
    () => (steps.length ? checklistProgress(steps) : goal?.progressPercent ?? 0),
    [steps, goal],
  );
  const currentStep = useMemo(() => currentStepNumber(steps), [steps]);

  async function handleApplyPlan() {
    if (!goal?.executionPlan) return;

    setBusy('applying');

    try {
      await applyFullGoalPlan({
        todos: goal.executionPlan.todos ?? [],
        habits: goal.executionPlan.habits ?? [],
        calendarBlocks: goal.executionPlan.calendarBlocks ?? [],
      });

      const allGoals = await loadPsycheGoals();
      const nextGoals = allGoals.map((item) =>
        item.id === goal.id ? { ...item, appliedToApp: true } : item,
      );

      await savePsycheGoals(nextGoals);
      setGoal((prev) => (prev ? { ...prev, appliedToApp: true } : prev));

      Alert.alert('Übernommen', 'Todos, Habits und Kalenderblöcke wurden in deine App übernommen.');
    } catch (error: any) {
      Alert.alert('Fehler', error?.message ?? 'Der Plan konnte nicht übernommen werden.');
    } finally {
      setBusy('idle');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <Text style={styles.loadingText}>Lade Ziel…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <Text style={styles.loadingText}>Ziel nicht gefunden.</Text>
          <Pressable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Zurück</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Zurück</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.kicker}>Ziel-Details</Text>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.subtitle}>
            {goal.category} · Schwierigkeit {goal.difficultyLevel}/10 · Zieltermin{' '}
            {dayjs(goal.targetDate).isValid() ? dayjs(goal.targetDate).format('DD.MM.YYYY') : 'offen'}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{progress}%</Text>
              <Text style={styles.statLabel}>Fortschritt</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{steps.length}</Text>
              <Text style={styles.statLabel}>Schritte</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{currentStep}</Text>
              <Text style={styles.statLabel}>Aktueller Step</Text>
            </View>
          </View>

          <ProgressBar value={progress} />

          <Text style={styles.summaryText}>
            {goal.recommendation?.summary ??
              executionPlan?.summary ??
              'Noch keine Zusammenfassung vorhanden.'}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleApplyPlan}
              disabled={busy !== 'idle'}
              style={[styles.primaryBtn, busy !== 'idle' && styles.btnDisabled]}
            >
              <Text style={styles.primaryBtnText}>
                {goal.appliedToApp
                  ? 'Schon übernommen'
                  : busy === 'applying'
                    ? 'Wird übernommen…'
                    : 'In App übernehmen'}
              </Text>
            </Pressable>
          </View>
        </View>

        <SectionCard title="Warum dieses Ziel">
          <Text style={styles.bodyText}>
            {goal.why?.trim() || 'Kein persönliches Warum hinterlegt.'}
          </Text>
        </SectionCard>

        <SectionCard title="Todos">
          {!executionPlan?.todos?.length ? (
            <EmptyBlock text="Noch keine Todos im Plan." />
          ) : (
            executionPlan.todos.map((todo, index) => (
              <View key={`${todo.title}_${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{todo.title}</Text>
                <Text style={styles.itemReason}>{todo.reason}</Text>
                {!!todo.note && <Text style={styles.itemMeta}>{todo.note}</Text>}
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Habits">
          {!executionPlan?.habits?.length ? (
            <EmptyBlock text="Noch keine Habits im Plan." />
          ) : (
            executionPlan.habits.map((habit, index) => (
              <View key={`${habit.title}_${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{habit.title}</Text>
                <Text style={styles.itemReason}>{habit.reason}</Text>
                <Text style={styles.itemMeta}>
                  {habit.frequencyPerWeek ? `${habit.frequencyPerWeek}x/Woche` : 'Wiederkehrend'}
                  {typeof habit.durationMinutes === 'number' && habit.durationMinutes > 0
                    ? ` · ${habit.durationMinutes} Min`
                    : ''}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Kalenderblöcke">
          {!executionPlan?.calendarBlocks?.length ? (
            <EmptyBlock text="Noch keine Kalenderblöcke im Plan." />
          ) : (
            executionPlan.calendarBlocks.map((block, index) => (
              <View key={`${block.title}_${index}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{block.title}</Text>
                <Text style={styles.itemReason}>{block.reason}</Text>
                <Text style={styles.itemMeta}>
                  {block.start ? formatDateTime(block.start) : `${block.dayLabel ?? 'Tag offen'}${block.startTime ? ` · ${block.startTime}` : ''}`}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Step-by-Step-Plan">
          {!steps.length ? (
            <EmptyBlock text="Noch keine Schritte vorhanden." />
          ) : (
            steps.map((step, index) => {
              const done = isStepDone(step);
              const active = currentStep === index + 1 && !done;

              return (
                <View
                  key={step.id}
                  style={[
                    styles.stepCard,
                    done && styles.stepCardDone,
                    active && styles.stepCardActive,
                  ]}
                >
                  <View style={styles.stepTop}>
                    <Text style={styles.stepBadge}>
                      STEP {String(step.order).padStart(2, '0')}
                    </Text>
                    <Text style={styles.stepState}>
                      {done ? 'Erledigt' : active ? 'Aktuell' : 'Geplant'}
                    </Text>
                  </View>

                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.explanation}</Text>
                  <Text style={styles.stepWhy}>{step.whyItMatters}</Text>

                  {!!step.checklist?.length && (
                    <View style={styles.checklistWrap}>
                      {step.checklist.map((item) => (
                        <View key={item.id} style={styles.checkRow}>
                          <View
                            style={[
                              styles.checkDot,
                              item.done && styles.checkDotDone,
                            ]}
                          />
                          <Text
                            style={[
                              styles.checkText,
                              item.done && styles.checkTextDone,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PSYCHE_THEME.bg,
  },
  content: {
    padding: 18,
    paddingBottom: 120,
    gap: 16,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: '#102754',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  kicker: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#76D88E',
  },
  summaryText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  actionRow: {
    marginTop: 14,
  },
  primaryBtn: {
    borderRadius: 16,
    backgroundColor: GOLD,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#1A1A1A',
    fontWeight: '900',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  card: {
    backgroundColor: '#132C5F',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  bodyText: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  itemCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  itemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  itemReason: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  itemMeta: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  stepCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  stepCardDone: {
    borderColor: 'rgba(118,216,142,0.25)',
    backgroundColor: 'rgba(118,216,142,0.10)',
  },
  stepCardActive: {
    borderColor: 'rgba(212,175,55,0.30)',
    backgroundColor: 'rgba(212,175,55,0.10)',
  },
  stepTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadge: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stepState: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 8,
  },
  stepText: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  stepWhy: {
    color: GOLD,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  checklistWrap: {
    marginTop: 12,
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  checkDotDone: {
    backgroundColor: '#76D88E',
  },
  checkText: {
    flex: 1,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    lineHeight: 20,
  },
  checkTextDone: {
    color: '#76D88E',
    fontWeight: '700',
  },
});
