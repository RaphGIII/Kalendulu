import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { GOLD, PSYCHE_THEME } from '../psyche/styles';
import { loadPsycheGoals, savePsycheGoals } from '../psyche/storage';
import {
  loadCalendarEventsBestEffort,
  loadHabitsState,
  loadTodoStateBestEffort,
} from '../psyche/adapters';
import { loadGoalLinks } from '../psyche/goalLinks';
import { enrichGoalsWithProgress } from '../psyche/engine/goalProgress';
import { computeGoalAdherence } from '../psyche/engine/goalAdherence';
import { detectGoalStagnation } from '../psyche/engine/goalStagnation';
import { buildGoalWeeklyReview } from '../psyche/engine/goalWeeklyReview';
import { evaluateGoalBackend } from '../psyche/engine/backendGoalEvaluator';
import { adaptGoalPlan } from '../psyche/engine/goalAdaptation';
import type { PsycheGoal } from '../psyche/types';

dayjs.locale('de');

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safeValue}%` }]} />
    </View>
  );
}

function trendLabel(trend?: 'up' | 'steady' | 'down') {
  if (trend === 'up') return 'Steigend';
  if (trend === 'down') return 'Rückläufig';
  return 'Stabil';
}

function statusLabel(goal: PsycheGoal) {
  if (!goal.progress) return 'Noch keine Bewertung';
  return goal.progress.onTrack ? 'On Track' : 'Achtung';
}

type GoalInsights = {
  adherence: ReturnType<typeof computeGoalAdherence>;
  stagnation: ReturnType<typeof detectGoalStagnation>;
  review: ReturnType<typeof buildGoalWeeklyReview>;
  backendEval: ReturnType<typeof evaluateGoalBackend>;
};

export default function ProgressScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adaptingGoalId, setAdaptingGoalId] = useState<string | null>(null);
  const [goals, setGoals] = useState<PsycheGoal[]>([]);
  const [insights, setInsights] = useState<Record<string, GoalInsights>>({});
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [progressDraft, setProgressDraft] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const [storedGoals, habitsState, todoState, calendarEvents, goalLinks] =
        await Promise.all([
          loadPsycheGoals(),
          loadHabitsState(),
          loadTodoStateBestEffort(),
          loadCalendarEventsBestEffort(),
          loadGoalLinks(),
        ]);

      const enriched = enrichGoalsWithProgress(
        storedGoals.filter((goal) => goal.status !== 'archived'),
        habitsState?.habits ?? [],
        todoState?.tasks ?? [],
        calendarEvents ?? [],
        goalLinks
      );

      const nextInsights: Record<string, GoalInsights> = {};

      for (const goal of enriched) {
        const adherence = computeGoalAdherence({
          goal,
          habits: habitsState?.habits ?? [],
          tasks: todoState?.tasks ?? [],
          calendarEvents: calendarEvents ?? [],
          goalLinks,
        });

        const stagnation = detectGoalStagnation({
          goal,
          adherence,
        });

        const review = buildGoalWeeklyReview({
          goal,
          adherence,
          stagnation,
        });

        const backendEval = evaluateGoalBackend(goal);

        nextInsights[goal.id] = {
          adherence,
          stagnation,
          review,
          backendEval,
        };
      }

      setGoals(enriched);
      setInsights(nextInsights);
      await savePsycheGoals(enriched);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Fortschritt konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'active' || goal.status === 'draft'),
    [goals]
  );

  async function saveSelfReport(goalId: string) {
    const parsed = Number(progressDraft.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      Alert.alert('Ungültig', 'Bitte gib eine Zahl zwischen 0 und 100 ein.');
      return;
    }

    const next = goals.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            userReportedProgress: Math.max(0, Math.min(100, parsed)),
            lastCheckInAt: new Date().toISOString(),
          }
        : goal
    );

    try {
      const [habitsState, todoState, calendarEvents, goalLinks] = await Promise.all([
        loadHabitsState(),
        loadTodoStateBestEffort(),
        loadCalendarEventsBestEffort(),
        loadGoalLinks(),
      ]);

      const enriched = enrichGoalsWithProgress(
        next,
        habitsState?.habits ?? [],
        todoState?.tasks ?? [],
        calendarEvents ?? [],
        goalLinks
      );

      const nextInsights: Record<string, GoalInsights> = {};

      for (const goal of enriched) {
        const adherence = computeGoalAdherence({
          goal,
          habits: habitsState?.habits ?? [],
          tasks: todoState?.tasks ?? [],
          calendarEvents: calendarEvents ?? [],
          goalLinks,
        });

        const stagnation = detectGoalStagnation({
          goal,
          adherence,
        });

        const review = buildGoalWeeklyReview({
          goal,
          adherence,
          stagnation,
        });

        const backendEval = evaluateGoalBackend(goal);

        nextInsights[goal.id] = {
          adherence,
          stagnation,
          review,
          backendEval,
        };
      }

      setGoals(enriched);
      setInsights(nextInsights);
      await savePsycheGoals(enriched);
      setEditingGoalId(null);
      setProgressDraft('');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Check-in konnte nicht gespeichert werden.');
    }
  }

  async function handleAdaptGoal(goal: PsycheGoal) {
    const insight = insights[goal.id];
    if (!insight) return;

    try {
      setAdaptingGoalId(goal.id);

      const result = adaptGoalPlan({
        goal,
        backendEvaluation: insight.backendEval,
        adherence: insight.adherence,
        stagnation: insight.stagnation,
      });

      const nextGoals = goals.map((item) =>
        item.id === goal.id ? result.adaptedGoal : item
      );

      setGoals(nextGoals);
      await savePsycheGoals(nextGoals);
      await refresh();

      Alert.alert('Plan angepasst', result.adaptationSummary);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht angepasst werden.');
    } finally {
      setAdaptingGoalId(null);
    }
  }

  function goToGoal(goalId: string) {
    router.push((`/goal/${goalId}`) as never);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.centerText}>Fortschritt wird geladen ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Fortschritt</Text>
          <Text style={styles.heroTitle}>Alle Zielsignale an einem Ort</Text>
          <Text style={styles.heroText}>
            Fortschritt, Ursachen, Weekly Review und Plananpassung laufen jetzt in einem einzigen Tab zusammen.
          </Text>
        </View>

        {activeGoals.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Noch keine aktiven Ziele</Text>
            <Text style={styles.cardText}>
              Lege zuerst im Psyche-Tab ein Ziel an. Danach erscheint hier automatisch die volle Zielanalyse.
            </Text>
          </View>
        ) : null}

        {activeGoals.map((goal) => {
          const progress = goal.progress;
          const total = progress?.total ?? 0;
          const insight = insights[goal.id];

          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => goToGoal(goal.id)}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                  </Pressable>
                  <Text style={styles.goalMeta}>
                    Ziel bis {dayjs(goal.targetDate).format('DD.MM.YYYY')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    progress?.onTrack ? styles.badgeGood : styles.badgeWarn,
                  ]}
                >
                  <Text style={styles.badgeText}>{statusLabel(goal)}</Text>
                </View>
              </View>

              <Text style={styles.percentLabel}>{total}% Gesamtfortschritt</Text>
              <ProgressBar value={total} />

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>Lv. {progress?.level ?? 1}</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{trendLabel(progress?.trend)}</Text>
                  <Text style={styles.statLabel}>Trend</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {goal.executionPlan?.intensityPreset ?? goal.intensityPreset ?? 'balanced'}
                  </Text>
                  <Text style={styles.statLabel}>Intensität</Text>
                </View>
              </View>

              <View style={styles.breakdownCard}>
                <Text style={styles.sectionTitle}>Bewertung</Text>
                <Text style={styles.breakdownLine}>
                  Plan-Tauglichkeit: {progress?.complianceScore ?? 0}%
                </Text>
                <Text style={styles.breakdownLine}>
                  Umsetzung: {progress?.executionScore ?? 0}%
                </Text>
                <Text style={styles.breakdownLine}>
                  Selbsteinschätzung: {progress?.selfReportScore ?? 0}%
                </Text>
                <Text style={styles.breakdownLine}>
                  Zielmetriken: {progress?.metricScore ?? 0}%
                </Text>
              </View>

              {insight ? (
                <>
                  <View style={styles.breakdownCard}>
                    <Text style={styles.sectionTitle}>Adherence</Text>
                    <Text style={styles.breakdownLine}>
                      Habits: {insight.adherence.habitAdherence}%
                    </Text>
                    <Text style={styles.breakdownLine}>
                      Todos: {insight.adherence.todoAdherence}%
                    </Text>
                    <Text style={styles.breakdownLine}>
                      Kalender: {insight.adherence.calendarAdherence}%
                    </Text>
                    <Text style={styles.breakdownLine}>
                      Gesamt: {insight.adherence.overallAdherence}%
                    </Text>

                    {insight.adherence.signals.map((signal, index) => (
                      <Text key={`${signal}-${index}`} style={styles.bulletText}>
                        • {signal}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.breakdownCard}>
                    <Text style={styles.sectionTitle}>Stagnation & Risiko</Text>
                    <Text style={styles.breakdownLine}>
                      Stagnation: {insight.stagnation.isStagnating ? 'Ja' : 'Nein'}
                    </Text>
                    <Text style={styles.breakdownLine}>
                      Schwere: {insight.stagnation.severity}
                    </Text>
                    <Text style={styles.breakdownLine}>
                      Grund: {insight.stagnation.reason}
                    </Text>
                    <Text style={styles.breakdownLine}>
                      Hauptrisiko: {insight.backendEval.mainRisk}
                    </Text>

                    {insight.backendEval.secondaryRisks.map((risk, index) => (
                      <Text key={`${risk}-${index}`} style={styles.bulletText}>
                        • {risk}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.breakdownCard}>
                    <Text style={styles.sectionTitle}>Weekly Review</Text>
                    <Text style={styles.reviewWeekLabel}>{insight.review.weekLabel}</Text>
                    <Text style={styles.cardText}>{insight.review.summary}</Text>

                    <Text style={styles.subTitle}>Wins</Text>
                    {insight.review.wins.length > 0 ? (
                      insight.review.wins.map((item, index) => (
                        <Text key={`${item}-${index}`} style={styles.bulletText}>
                          • {item}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.cardText}>Noch keine klaren Wins erkennbar.</Text>
                    )}

                    <Text style={styles.subTitle}>Concerns</Text>
                    {insight.review.concerns.length > 0 ? (
                      insight.review.concerns.map((item, index) => (
                        <Text key={`${item}-${index}`} style={styles.bulletText}>
                          • {item}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.cardText}>Aktuell keine größeren Warnsignale.</Text>
                    )}

                    <Text style={styles.subTitle}>Nächste Woche Fokus</Text>
                    {insight.review.nextWeekFocus.map((item, index) => (
                      <Text key={`${item}-${index}`} style={styles.bulletText}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.breakdownCard}>
                <Text style={styles.sectionTitle}>Eigener Check-in</Text>

                {editingGoalId === goal.id ? (
                  <>
                    <TextInput
                      value={progressDraft}
                      onChangeText={setProgressDraft}
                      keyboardType="numeric"
                      placeholder="0 bis 100"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      style={styles.input}
                    />
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.actionBtn, styles.primaryBtn]}
                        onPress={() => saveSelfReport(goal.id)}
                      >
                        <Text style={styles.primaryBtnText}>Speichern</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.secondaryBtn]}
                        onPress={() => {
                          setEditingGoalId(null);
                          setProgressDraft('');
                        }}
                      >
                        <Text style={styles.secondaryBtnText}>Abbrechen</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardText}>
                      Deine letzte Selbsteinschätzung: {goal.userReportedProgress}%
                    </Text>
                    <Pressable
                      style={[styles.actionBtn, styles.primaryBtn]}
                      onPress={() => {
                        setEditingGoalId(goal.id);
                        setProgressDraft(String(goal.userReportedProgress));
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Fortschritt aktualisieren</Text>
                    </Pressable>
                  </>
                )}
              </View>

              <View style={styles.goalActionsRow}>
                <Pressable
                  style={styles.goalActionBtn}
                  onPress={() => goToGoal(goal.id)}
                >
                  <Text style={styles.goalActionBtnText}>Details</Text>
                </Pressable>

                <Pressable
                  style={styles.goalActionBtn}
                  onPress={() => handleAdaptGoal(goal)}
                  disabled={adaptingGoalId === goal.id}
                >
                  <Text style={styles.goalActionBtnText}>
                    {adaptingGoalId === goal.id ? 'Passt an ...' : 'Plan anpassen'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshBtnText}>Neu berechnen</Text>
        </Pressable>
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
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  centerText: {
    color: PSYCHE_THEME.text,
    fontSize: 15,
  },
  heroCard: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  heroEyebrow: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroText: {
    color: PSYCHE_THEME.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: PSYCHE_THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  cardTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: PSYCHE_THEME.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  goalCard: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    gap: 12,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  goalTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 20,
    fontWeight: '800',
  },
  goalMeta: {
    color: PSYCHE_THEME.muted,
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
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
  badgeText: {
    color: PSYCHE_THEME.text,
    fontSize: 12,
    fontWeight: '700',
  },
  percentLabel: {
    color: PSYCHE_THEME.text,
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 999,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statValue: {
    color: PSYCHE_THEME.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: PSYCHE_THEME.muted,
    fontSize: 12,
  },
  breakdownCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  subTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  breakdownLine: {
    color: PSYCHE_THEME.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  reviewWeekLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  bulletText: {
    color: PSYCHE_THEME.text,
    fontSize: 14,
    lineHeight: 21,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: PSYCHE_THEME.text,
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: GOLD,
    flex: 1,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    flex: 1,
  },
  primaryBtnText: {
    color: '#162033',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtnText: {
    color: PSYCHE_THEME.text,
    fontSize: 14,
    fontWeight: '700',
  },
  goalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  goalActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.28)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalActionBtnText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 14,
  },
  refreshBtn: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.28)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  refreshBtnText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 14,
  },
});