import React, { useMemo, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { fetchGoalRefinement } from './refinementApi';
import { fetchPlannerBundle } from './plannerApi';
import { applyFullGoalPlan } from './adapters';
import type {
  GoalAnswerMap,
  GoalQuestion,
  GoalRefinementResponse,
  PlannerBundle,
  PlannerExecutionStep,
} from './types';

dayjs.locale('de');

const BG = '#2E437A';
const BG_DARK = '#233A73';
const CARD = '#314A86';
const CARD_DARK = '#243D77';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';
const GOLD = '#D4AF37';

const PLAN_STORAGE_KEY = 'kalendulu_ai_goal_plans_v2';

type Mode = 'start' | 'questions' | 'plan';
type Phase = 'idle' | 'refine' | 'plan' | 'apply';

type StoredGoalPlan = {
  id: string;
  title: string;
  createdAt: string;
  refinement: GoalRefinementResponse | null;
  planner: PlannerBundle;
};

function uid() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StepList({ steps }: { steps: PlannerExecutionStep[] }) {
  if (!steps.length) return null;

  return (
    <View style={{ marginTop: 10, gap: 12 }}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
          </View>

          <Text style={styles.stepText}>{step.explanation}</Text>

          {step.checklist?.length ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {step.checklist.map((item) => (
                <View key={item.id} style={styles.stepChecklistItem}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepChecklistText}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function PsycheScreen() {
  const [mode, setMode] = useState<Mode>('start');
  const [phase, setPhase] = useState<Phase>('idle');

  const [goalText, setGoalText] = useState('');
  const [refinement, setRefinement] = useState<GoalRefinementResponse | null>(null);
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [answers, setAnswers] = useState<GoalAnswerMap>({});
  const [planner, setPlanner] = useState<PlannerBundle | null>(null);

  const loading = phase !== 'idle';

  const executionSteps = useMemo(() => planner?.executionSteps ?? [], [planner]);

  function resetAll() {
    setMode('start');
    setPhase('idle');
    setGoalText('');
    setRefinement(null);
    setQuestions([]);
    setAnswers({});
    setPlanner(null);
  }

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, optionId: string) {
    const current = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    const next = current.includes(optionId)
      ? current.filter((v) => v !== optionId)
      : [...current, optionId];

    setAnswer(id, next);
  }

  function allRequiredFilled() {
    return questions.every((question) => {
      if (!question.required) return true;
      const value = answers[question.id];
      if (Array.isArray(value)) return value.length > 0;
      return typeof value === 'string' ? value.trim().length > 0 : typeof value === 'number';
    });
  }

  async function saveCurrentPlan(currentPlanner: PlannerBundle, currentRefinement: GoalRefinementResponse | null) {
    const raw = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
    const current: StoredGoalPlan[] = raw ? JSON.parse(raw) : [];

    const nextEntry: StoredGoalPlan = {
      id: uid(),
      title: goalText.trim() || currentRefinement?.goalLabel || 'Neues Ziel',
      createdAt: new Date().toISOString(),
      refinement: currentRefinement,
      planner: currentPlanner,
    };

    const next = [nextEntry, ...current.filter((item) => item.title !== nextEntry.title)];
    await AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next));
  }

  async function startRefinement() {
    if (!goalText.trim()) {
      Alert.alert('Ziel fehlt', 'Bitte gib zuerst ein Ziel ein.');
      return;
    }

    try {
      setPhase('refine');

      const result = await fetchGoalRefinement({
        goal: goalText.trim(),
        pastGoals: [],
        profile: {
          energyWindow: 'mixed',
          planningStyle: 'mixed',
          startStyle: 'balanced',
          frictionPoints: [],
          motivationDrivers: [],
          preferredSessionMinutes: 45,
          consistencyScore: 50,
          completionStyle: 'small_steps',
          successfulPatterns: [],
          failedPatterns: [],
        },
      });

      setRefinement(result);
      setQuestions(result.questions);
      setAnswers({});
      setPlanner(null);
      setMode('questions');
    } catch (error) {
      console.error(error);
      Alert.alert('KI-Fehler', 'Die Fragen konnten nicht geladen werden.');
    } finally {
      setPhase('idle');
    }
  }

  async function generatePlan() {
    if (!allRequiredFilled()) {
      Alert.alert('Unvollständig', 'Bitte beantworte zuerst alle Pflichtfragen.');
      return;
    }

    try {
      setPhase('plan');

      const result = await fetchPlannerBundle({
        goals: [],
        profile: {
          discipline: 50,
          consistency: 50,
          focus: 50,
          planning: 50,
          recovery: 50,
          momentum: 50,
        },
        signals: {
          habitCheckinsToday: 0,
          habitCheckins7d: 0,
          habitActiveDays7d: 0,
          tasksDoneToday: 0,
          tasksDone7d: 0,
          tasksTotal7d: 0,
          calendarHoursToday: 0,
          calendarHours7d: 0,
          calendarEarlyStartScore: 0,
          momentum7d: 0,
        },
        freeSlots: [
          {
            start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            durationMinutes: 60,
          },
        ],
        answers,
        userPlanningProfile: {
          energyWindow: 'mixed',
          planningStyle: 'mixed',
          startStyle: 'balanced',
          frictionPoints: [],
          motivationDrivers: [],
          preferredSessionMinutes: 45,
          consistencyScore: 50,
          completionStyle: 'small_steps',
          successfulPatterns: [],
          failedPatterns: [],
        },
      });

      setPlanner(result);
      await saveCurrentPlan(result, refinement);
      setMode('plan');
    } catch (error) {
      console.error(error);
      Alert.alert('KI-Fehler', 'Der Plan konnte nicht erzeugt werden.');
    } finally {
      setPhase('idle');
    }
  }

  async function applyAll() {
    if (!planner) return;

    try {
      setPhase('apply');

      const todos = [
        {
          title: planner.primary.todo.title,
          reason: planner.primary.todo.reason,
          note: planner.primary.todo.instruction,
          priority: 'high' as const,
        },
      ];

      const habits = [
        {
          title: planner.primary.habit.title,
          description: planner.primary.habit.reason,
          cadence: 'daily',
          targetPerDay: 1,
          durationMinutes: planner.primary.routines[0]?.durationMinutes ?? 20,
          reason: planner.primary.habit.reason,
        },
        ...planner.primary.routines.map((routine) => ({
          title: routine.title,
          description: routine.reason,
          cadence: 'weekly',
          targetPerDay: 1,
          durationMinutes: routine.durationMinutes ?? 20,
          reason: routine.reason,
        })),
      ];

      const calendarBlocks = [
        {
          title: planner.primary.calendar.title,
          start: planner.primary.calendar.start,
          end: planner.primary.calendar.end,
          description: planner.primary.calendar.reason,
          reason: planner.primary.calendar.reason,
        },
        ...planner.primary.routines.flatMap((routine) =>
          routine.blocks.map((block) => ({
            title: block.title,
            start: block.start,
            end: block.end,
            description: routine.reason,
            reason: routine.reason,
          }))
        ),
      ];

      await applyFullGoalPlan({
        todos,
        habits,
        calendarBlocks,
      });

      Alert.alert('Übernommen', 'Todos, Habits und Kalenderblöcke wurden übernommen.');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht übernommen werden.');
    } finally {
      setPhase('idle');
    }
  }

  function renderQuestion(question: GoalQuestion) {
    const value = answers[question.id];

    return (
      <View key={question.id} style={styles.questionCard}>
        <View style={styles.questionRow}>
          <Text style={styles.questionTitle}>{question.title}</Text>
          {question.required ? <Text style={styles.required}>Pflicht</Text> : null}
        </View>

        {question.whyAsked ? (
          <Text style={styles.questionWhy}>{question.whyAsked}</Text>
        ) : null}

        {(question.type === 'text' || question.type === 'long_text') ? (
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={(text) => setAnswer(question.id, text)}
            placeholder={question.placeholder ?? 'Antwort'}
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline={question.type === 'long_text'}
            textAlignVertical={question.type === 'long_text' ? 'top' : 'center'}
            style={[styles.input, question.type === 'long_text' && styles.textarea]}
          />
        ) : null}

        {(question.type === 'single_choice' || question.type === 'multi_choice') ? (
          <View style={styles.optionWrap}>
            {question.options?.map((option) => {
              const selected =
                question.type === 'single_choice'
                  ? value === option.id
                  : Array.isArray(value) && value.includes(option.id);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    if (question.type === 'single_choice') {
                      setAnswer(question.id, option.id);
                    } else {
                      toggleMulti(question.id, option.id);
                    }
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Psyche</Text>
          <Text style={styles.heroSubtitle}>
            Die KI soll den Plan übernehmen. Kein Meta-Gelaber, sondern konkrete Schritte.
          </Text>
        </View>

        {mode === 'start' ? (
          <Section title="Neues Ziel">
            <TextInput
              value={goalText}
              onChangeText={setGoalText}
              placeholder="Zum Beispiel: In 12 Wochen 5 kg abnehmen"
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.goalInput]}
            />

            <Pressable style={styles.primaryButton} onPress={startRefinement} disabled={loading}>
              {phase === 'refine' ? (
                <ActivityIndicator color="#13213F" />
              ) : (
                <Text style={styles.primaryButtonText}>KI-Fragen laden</Text>
              )}
            </Pressable>
          </Section>
        ) : null}

        {mode === 'questions' ? (
          <>
            <Section title="KI-Einschätzung">
              <Text style={styles.metaText}>
                Kategorie: {refinement?.analysis?.category ?? refinement?.goalType ?? 'other'}
              </Text>
              <Text style={styles.metaText}>
                Schwierigkeit: {refinement?.analysis?.difficulty ?? 'medium'}
              </Text>
              <Text style={styles.metaText}>
                Komplexität: {refinement?.analysis?.complexity ?? 'moderate'}
              </Text>
              <Text style={styles.metaText}>
                Rückfragen: {questions.length}
              </Text>
            </Section>

            <Section title="Fragen">
              {questions.map(renderQuestion)}

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={resetAll}>
                  <Text style={styles.secondaryButtonText}>Zurück</Text>
                </Pressable>

                <Pressable style={styles.primaryButton} onPress={generatePlan} disabled={loading}>
                  {phase === 'plan' ? (
                    <ActivityIndicator color="#13213F" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Plan erzeugen</Text>
                  )}
                </Pressable>
              </View>
            </Section>
          </>
        ) : null}

        {mode === 'plan' && planner ? (
          <>
            <Section title="Dein Plan">
              <Text style={styles.planHeadline}>{goalText.trim()}</Text>
              <Text style={styles.planSummary}>
                {planner.planMeta?.summary ?? planner.primary.todo.reason}
              </Text>
            </Section>

            <Section title="Was du konkret machen sollst">
              <View style={styles.planItem}>
                <Text style={styles.planItemLabel}>Todo</Text>
                <Text style={styles.planItemTitle}>{planner.primary.todo.title}</Text>
                <Text style={styles.planItemText}>{planner.primary.todo.reason}</Text>
                {planner.primary.todo.instruction ? (
                  <Text style={styles.planItemSub}>{planner.primary.todo.instruction}</Text>
                ) : null}
              </View>

              <View style={styles.planItem}>
                <Text style={styles.planItemLabel}>Habit</Text>
                <Text style={styles.planItemTitle}>{planner.primary.habit.title}</Text>
                <Text style={styles.planItemText}>{planner.primary.habit.reason}</Text>
                {planner.primary.habit.instruction ? (
                  <Text style={styles.planItemSub}>{planner.primary.habit.instruction}</Text>
                ) : null}
              </View>

              <View style={styles.planItem}>
                <Text style={styles.planItemLabel}>Kalender</Text>
                <Text style={styles.planItemTitle}>{planner.primary.calendar.title}</Text>
                <Text style={styles.planItemText}>
                  {dayjs(planner.primary.calendar.start).format('DD.MM. HH:mm')} – {dayjs(planner.primary.calendar.end).format('HH:mm')}
                </Text>
                <Text style={styles.planItemSub}>{planner.primary.calendar.reason}</Text>
              </View>
            </Section>

            {!!planner.primary.routines.length && (
              <Section title="Wiederkehrende Struktur">
                {planner.primary.routines.map((routine, index) => (
                  <View key={`${routine.title}_${index}`} style={styles.routineCard}>
                    <Text style={styles.routineTitle}>{routine.title}</Text>
                    <Text style={styles.routineText}>{routine.reason}</Text>
                    <Text style={styles.routineMeta}>
                      {routine.frequencyPerWeek}x pro Woche • {routine.durationMinutes ?? 20} Min
                    </Text>
                  </View>
                ))}
              </Section>
            )}

            <Section title="Step-by-Step-Weg">
              <StepList steps={executionSteps} />
            </Section>

            <Section title="Übernehmen">
              <Text style={styles.takeoverText}>
                Hier übernimmt die App wieder den Plan für dich in Todos, Habits und Kalender.
              </Text>

              <Pressable style={styles.primaryButton} onPress={applyAll} disabled={loading}>
                {phase === 'apply' ? (
                  <ActivityIndicator color="#13213F" />
                ) : (
                  <Text style={styles.primaryButtonText}>Alles übernehmen</Text>
                )}
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={resetAll}>
                <Text style={styles.secondaryButtonText}>Neues Ziel</Text>
              </Pressable>
            </Section>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 16,
  },
  hero: {
    backgroundColor: BG_DARK,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroTitle: {
    color: TEXT,
    fontSize: 30,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    marginTop: 14,
    backgroundColor: CARD_DARK,
    color: TEXT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 110,
  },
  goalInput: {
    minHeight: 120,
  },
  primaryButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#13213F',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '900',
  },
  metaText: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  questionCard: {
    marginTop: 14,
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  questionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    lineHeight: 23,
  },
  required: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  questionWhy: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  optionSelected: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: 'rgba(212,175,55,0.34)',
  },
  optionText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  optionTextSelected: {
    color: GOLD,
  },
  actionRow: {
    marginTop: 10,
  },
  planHeadline: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  planSummary: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  planItem: {
    marginTop: 14,
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  planItemLabel: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  planItemTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 6,
  },
  planItemText: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  planItemSub: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  routineCard: {
    marginTop: 12,
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  routineTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
  },
  routineText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  routineMeta: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  stepCard: {
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#13213F',
    fontWeight: '900',
    fontSize: 13,
  },
  stepTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  stepText: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  stepChecklistItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  stepChecklistText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  takeoverText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
});