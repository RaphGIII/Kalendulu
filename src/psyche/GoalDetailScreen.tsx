import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { GOLD, PSYCHE_THEME } from './styles';
import { loadPsycheGoals, savePsycheGoals } from './storage';
import {
  loadCalendarEventsBestEffort,
  loadHabitsState,
  loadTodoStateBestEffort,
} from './adapters';
import { loadGoalLinks } from './goalLinks';
import { enrichGoalsWithProgress } from './engine/goalProgress';
import { computeGoalAdherence } from './engine/goalAdherence';
import { detectGoalStagnation } from './engine/goalStagnation';
import { buildGoalWeeklyReview } from './engine/goalWeeklyReview';
import { evaluateGoalBackend } from './engine/backendGoalEvaluator';
import { adaptGoalPlan } from './engine/goalAdaptation';
import { applyGoalExecutionPlan } from './engine/goalApply';
import { rebuildGoalForIntensity } from './engine/goalRebuild';
import type { GoalIntensityPreset, PsycheGoal } from './types';

dayjs.locale('de');

const PRESETS: GoalIntensityPreset[] = ['gentle', 'balanced', 'ambitious', 'extreme'];

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safe}%` }]} />
    </View>
  );
}

function statusColor(onTrack?: boolean) {
  return onTrack ? styles.badgeGood : styles.badgeWarn;
}

function nextPreset(current?: GoalIntensityPreset, delta = 1): GoalIntensityPreset {
  const safe = current ?? 'balanced';
  const index = PRESETS.indexOf(safe);
  const nextIndex = Math.max(0, Math.min(PRESETS.length - 1, index + delta));
  return PRESETS[nextIndex];
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<PsycheGoal | null>(null);
  const [allGoals, setAllGoals] = useState<PsycheGoal[]>([]);
  const [busy, setBusy] = useState(false);

  const [adherence, setAdherence] = useState<ReturnType<typeof computeGoalAdherence> | null>(null);
  const [stagnation, setStagnation] = useState<ReturnType<typeof detectGoalStagnation> | null>(null);
  const [review, setReview] = useState<ReturnType<typeof buildGoalWeeklyReview> | null>(null);
  const [backendEval, setBackendEval] = useState<ReturnType<typeof evaluateGoalBackend> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const [storedGoals, habitsState, todoState, calendarEvents, goalLinks] = await Promise.all([
        loadPsycheGoals(),
        loadHabitsState(),
        loadTodoStateBestEffort(),
        loadCalendarEventsBestEffort(),
        loadGoalLinks(),
      ]);

      const enriched = enrichGoalsWithProgress(
        storedGoals,
        habitsState?.habits ?? [],
        todoState?.tasks ?? [],
        calendarEvents ?? [],
        goalLinks
      );

      await savePsycheGoals(enriched);
      setAllGoals(enriched);

      const currentGoal = enriched.find((item) => item.id === id) ?? null;
      setGoal(currentGoal);

      if (currentGoal) {
        const adh = computeGoalAdherence({
          goal: currentGoal,
          habits: habitsState?.habits ?? [],
          tasks: todoState?.tasks ?? [],
          calendarEvents: calendarEvents ?? [],
          goalLinks,
        });

        const stag = detectGoalStagnation({
          goal: currentGoal,
          adherence: adh,
        });

        const weekReview = buildGoalWeeklyReview({
          goal: currentGoal,
          adherence: adh,
          stagnation: stag,
        });

        const evalResult = evaluateGoalBackend(currentGoal);

        setAdherence(adh);
        setStagnation(stag);
        setReview(weekReview);
        setBackendEval(evalResult);
      } else {
        setAdherence(null);
        setStagnation(null);
        setReview(null);
        setBackendEval(null);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die Zieldetails konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const intensityLabel = useMemo(
    () => goal?.executionPlan?.intensityPreset ?? goal?.intensityPreset ?? 'balanced',
    [goal]
  );

  async function updateGoal(nextGoal: PsycheGoal) {
    const nextGoals = allGoals.map((item) => (item.id === nextGoal.id ? nextGoal : item));
    setAllGoals(nextGoals);
    await savePsycheGoals(nextGoals);
    await refresh();
  }

  async function handleApplyPlan() {
    if (!goal) return;
    try {
      setBusy(true);
      const result = await applyGoalExecutionPlan(goal);
      await refresh();
      Alert.alert(
        'Plan übernommen',
        `${result.todosAdded} Todos, ${result.habitsAdded} Habits und ${result.calendarAdded} Kalenderblöcke wurden hinzugefügt.`
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht übernommen werden.');
    } finally {
      setBusy(false);
    }
  }

  async function handleIntensity(delta: 1 | -1) {
    if (!goal) return;
    try {
      setBusy(true);
      const next = rebuildGoalForIntensity(goal, nextPreset(intensityLabel, delta));
      await updateGoal(next);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die Intensität konnte nicht angepasst werden.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdaptPlan() {
    if (!goal || !adherence || !stagnation || !backendEval) return;
    try {
      setBusy(true);
      const result = adaptGoalPlan({
        goal,
        backendEvaluation: backendEval,
        adherence,
        stagnation,
      });
      await updateGoal(result.adaptedGoal);
      Alert.alert('Plan angepasst', result.adaptationSummary);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht angepasst werden.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.centerText}>Ziel wird geladen ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>Ziel nicht gefunden.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Zurück</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Ziel-Detail</Text>
          <Text style={styles.heroTitle}>{goal.title}</Text>
          <Text style={styles.heroText}>
            {goal.category} · bis {dayjs(goal.targetDate).format('DD.MM.YYYY')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Fortschritt</Text>
            <View style={[styles.badge, statusColor(goal.progress?.onTrack)]}>
              <Text style={styles.badgeText}>
                {goal.progress?.onTrack ? 'On Track' : 'Achtung'}
              </Text>
            </View>
          </View>

          <Text style={styles.bigValue}>{goal.progress?.total ?? 0}%</Text>
          <ProgressBar value={goal.progress?.total ?? 0} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>Lv. {goal.progress?.level ?? 1}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{goal.progress?.trend ?? 'steady'}</Text>
              <Text style={styles.statLabel}>Trend</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{goal.diagnostic.estimatedDifficulty}</Text>
              <Text style={styles.statLabel}>Schwere</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Intensität</Text>
          <View style={styles.intensityRow}>
            <Pressable style={styles.smallBtn} onPress={() => handleIntensity(-1)} disabled={busy}>
              <Text style={styles.smallBtnText}>−</Text>
            </Pressable>
            <Text style={styles.intensityText}>{intensityLabel}</Text>
            <Pressable style={styles.smallBtn} onPress={() => handleIntensity(1)} disabled={busy}>
              <Text style={styles.smallBtnText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.cardText}>
            Minuten/Woche: {goal.requirements.requiredMinutesPerWeek}
          </Text>
        </View>

        {adherence ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Adherence</Text>
            <Text style={styles.cardLine}>Habits: {adherence.habitAdherence}%</Text>
            <Text style={styles.cardLine}>Todos: {adherence.todoAdherence}%</Text>
            <Text style={styles.cardLine}>Kalender: {adherence.calendarAdherence}%</Text>
            <Text style={styles.cardLine}>Gesamt: {adherence.overallAdherence}%</Text>

            {adherence.signals.map((signal, index) => (
              <Text key={`${signal}-${index}`} style={styles.bulletText}>
                • {signal}
              </Text>
            ))}
          </View>
        ) : null}

        {stagnation ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stagnation</Text>
            <Text style={styles.cardLine}>
              Status: {stagnation.isStagnating ? 'Ja' : 'Nein'}
            </Text>
            <Text style={styles.cardLine}>Schwere: {stagnation.severity}</Text>
            <Text style={styles.cardLine}>Grund: {stagnation.reason}</Text>
            <Text style={styles.cardLine}>
              Hinweis: {stagnation.recommendationHint}
            </Text>
          </View>
        ) : null}

        {backendEval ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Backend-Bewertung</Text>
            <Text style={styles.cardLine}>Feasibility: {backendEval.feasibility}</Text>
            <Text style={styles.cardLine}>Strukturqualität: {backendEval.structureQuality}</Text>
            <Text style={styles.cardLine}>Plan-Druck: {backendEval.planPressure}</Text>
            <Text style={styles.cardLine}>Hauptrisiko: {backendEval.mainRisk}</Text>

            {backendEval.secondaryRisks.map((risk, index) => (
              <Text key={`${risk}-${index}`} style={styles.bulletText}>
                • {risk}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Miniziele</Text>
          {goal.milestones.map((milestone) => (
            <View key={milestone.id} style={styles.milestoneRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                {milestone.description ? (
                  <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                ) : null}
              </View>
              <Text style={styles.milestoneMeta}>{milestone.targetPercent}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Wochenplan</Text>
          {goal.executionPlan?.habits.map((habit) => (
            <View key={habit.id} style={styles.planItem}>
              <Text style={styles.planTitle}>{habit.title}</Text>
              <Text style={styles.planMeta}>
                {habit.frequencyPerWeek}× pro Woche · {habit.durationMinutes} Min
              </Text>
              <Text style={styles.planReason}>{habit.reason}</Text>
            </View>
          ))}
        </View>

        {review ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Review</Text>
            <Text style={styles.cardLine}>{review.weekLabel}</Text>
            <Text style={styles.cardText}>{review.summary}</Text>

            <Text style={styles.subTitle}>Wins</Text>
            {review.wins.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.bulletText}>
                • {item}
              </Text>
            ))}

            <Text style={styles.subTitle}>Concerns</Text>
            {review.concerns.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.bulletText}>
                • {item}
              </Text>
            ))}

            <Text style={styles.subTitle}>Nächste Woche Fokus</Text>
            {review.nextWeekFocus.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push('/(tabs)/progress')}
          >
            <Text style={styles.secondaryBtnText}>Zurück zu Fortschritt</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleAdaptPlan} disabled={busy}>
            <Text style={styles.secondaryBtnText}>Plan anpassen</Text>
          </Pressable>
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleApplyPlan} disabled={busy}>
          <Text style={styles.primaryBtnText}>
            {busy ? 'Bitte warten ...' : 'Plan in App übernehmen'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PSYCHE_THEME.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: PSYCHE_THEME.text, fontSize: 15 },
  heroCard: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  heroEyebrow: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  heroTitle: { color: PSYCHE_THEME.text, fontSize: 23, fontWeight: '800' },
  heroText: { color: PSYCHE_THEME.muted, fontSize: 14, marginTop: 6 },
  card: {
    backgroundColor: PSYCHE_THEME.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: PSYCHE_THEME.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  subTitle: { color: GOLD, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeGood: {
    backgroundColor: 'rgba(69, 201, 122, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(69, 201, 122, 0.35)',
  },
  badgeWarn: {
    backgroundColor: 'rgba(255, 184, 77, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 77, 0.35)',
  },
  badgeText: { color: PSYCHE_THEME.text, fontSize: 12, fontWeight: '700' },
  bigValue: { color: PSYCHE_THEME.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: GOLD, borderRadius: 999 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
  },
  statValue: { color: PSYCHE_THEME.text, fontSize: 15, fontWeight: '800' },
  statLabel: { color: PSYCHE_THEME.muted, fontSize: 12, marginTop: 4 },
  intensityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  intensityText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: PSYCHE_THEME.text, fontSize: 18, fontWeight: '800' },
  cardText: { color: PSYCHE_THEME.muted, fontSize: 14, lineHeight: 20 },
  cardLine: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 22 },
  bulletText: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 21 },
  milestoneRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  milestoneTitle: { color: PSYCHE_THEME.text, fontSize: 14, fontWeight: '700' },
  milestoneDesc: { color: PSYCHE_THEME.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  milestoneMeta: { color: GOLD, fontSize: 13, fontWeight: '800' },
  planItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  planTitle: { color: PSYCHE_THEME.text, fontSize: 14, fontWeight: '700' },
  planMeta: { color: GOLD, fontSize: 12, fontWeight: '700', marginTop: 4 },
  planReason: { color: PSYCHE_THEME.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#162033', fontSize: 14, fontWeight: '800' },
  secondaryBtnText: { color: PSYCHE_THEME.text, fontSize: 14, fontWeight: '700' },
});