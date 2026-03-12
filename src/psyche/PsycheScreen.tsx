import React, { useEffect, useMemo, useState } from 'react';
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
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { GOLD, PSYCHE_THEME } from './styles';
import { loadPsycheGoals, savePsycheGoals } from './storage';
import {
  loadCalendarEventsBestEffort,
  loadHabitsState,
  loadTodoStateBestEffort,
} from './adapters';
import { buildUserPlanningProfile } from './buildUserPlanningProfile';
import { buildDynamicGoalQuestionnaire } from './engine/goalQuestionnaire';
import { buildGoalFromAnswers, validateQuestionnaire } from './engine/goalBuilder';
import { enrichGoalsWithProgress } from './engine/goalProgress';
import { applyGoalExecutionPlan } from './engine/goalApply';
import { rebuildGoalForIntensity } from './engine/goalRebuild';
import { loadGoalLinks, removeGoalLinkEntry } from './goalLinks';
import type {
  GoalAnswerMap,
  GoalIntensityPreset,
  GoalQuestion,
  PsycheGoal,
} from './types';

dayjs.locale('de');

type Step = 'goal' | 'questions' | 'summary';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ProgressMiniBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamp(value)}%` }]} />
    </View>
  );
}

const PRESETS: GoalIntensityPreset[] = ['gentle', 'balanced', 'ambitious', 'extreme'];

function nextPreset(current?: GoalIntensityPreset, delta = 1): GoalIntensityPreset {
  const safeCurrent = current ?? 'balanced';
  const index = PRESETS.indexOf(safeCurrent);
  const nextIndex = Math.max(0, Math.min(PRESETS.length - 1, index + delta));
  return PRESETS[nextIndex];
}

export default function PsycheScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [goals, setGoals] = useState<PsycheGoal[]>([]);
  const [goalInput, setGoalInput] = useState('');

  const [step, setStep] = useState<Step>('goal');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategoryLabel, setDraftCategoryLabel] = useState('');
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [answers, setAnswers] = useState<GoalAnswerMap>({});
  const [draftGoal, setDraftGoal] = useState<PsycheGoal | null>(null);

  const latestGoal = useMemo(() => goals[goals.length - 1] ?? null, [goals]);

  async function refreshGoals(nextGoals?: PsycheGoal[]) {
    const safeGoals = nextGoals ?? goals;

    const [habitsState, todoState, calendarEvents, goalLinks] = await Promise.all([
      loadHabitsState(),
      loadTodoStateBestEffort(),
      loadCalendarEventsBestEffort(),
      loadGoalLinks(),
    ]);

    const enriched = enrichGoalsWithProgress(
      safeGoals,
      habitsState?.habits ?? [],
      todoState?.tasks ?? [],
      calendarEvents ?? [],
      goalLinks
    );

    setGoals(enriched);
    await savePsycheGoals(enriched);
    return enriched;
  }

  useEffect(() => {
    (async () => {
      try {
        const storedGoals = await loadPsycheGoals();
        await refreshGoals(storedGoals);
      } catch (error) {
        console.error(error);
        Alert.alert('Fehler', 'Der Psyche-Tab konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setAnswer(id: string, value: string | number | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMultiChoice(questionId: string, optionId: string) {
    const current = Array.isArray(answers[questionId]) ? (answers[questionId] as string[]) : [];
    const hasOption = current.includes(optionId);
    const next = hasOption ? current.filter((x) => x !== optionId) : [...current, optionId];
    setAnswer(questionId, next);
  }

  async function startDynamicQuestionnaire() {
    const title = goalInput.trim();
    if (!title) {
      Alert.alert('Ziel fehlt', 'Bitte gib zuerst ein Ziel ein.');
      return;
    }

    try {
      setSubmitting(true);

      const [habits, todo, calendarEvents] = await Promise.all([
        loadHabitsState(),
        loadTodoStateBestEffort(),
        loadCalendarEventsBestEffort(),
      ]);

      const userPlanningProfile = buildUserPlanningProfile({
        goals,
        todo,
        habits,
        calendarEvents,
      });

      const refinement = buildDynamicGoalQuestionnaire({
        goal: title,
        pastGoals: goals,
        profile: userPlanningProfile,
      });

      setDraftTitle(title);
      setDraftCategoryLabel(refinement.goalType);
      setQuestions(refinement.questions);
      setAnswers({});
      setDraftGoal(null);
      setStep('questions');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die dynamischen Fragen konnten nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function buildGoalPreview() {
    try {
      const validation = validateQuestionnaire(questions, answers);
      if (!validation.valid) {
        Alert.alert('Unvollständig', 'Bitte beantworte zuerst alle Pflichtfragen.');
        return;
      }

      setSubmitting(true);

      const [habits, todo, calendarEvents] = await Promise.all([
        loadHabitsState(),
        loadTodoStateBestEffort(),
        loadCalendarEventsBestEffort(),
      ]);

      const userPlanningProfile = buildUserPlanningProfile({
        goals,
        todo,
        habits,
        calendarEvents,
      });

      const builtGoal = buildGoalFromAnswers({
        title: draftTitle,
        category: (draftCategoryLabel as PsycheGoal['category']) || 'other',
        answers,
        profile: userPlanningProfile,
      });

      const goalLinks = await loadGoalLinks();

      const enrichedPreview = enrichGoalsWithProgress(
        [builtGoal],
        habits?.habits ?? [],
        todo?.tasks ?? [],
        calendarEvents ?? [],
        goalLinks
      )[0];

      setDraftGoal(enrichedPreview);
      setStep('summary');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die Zielvorschau konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraftGoal() {
    if (!draftGoal) return;

    try {
      setSubmitting(true);
      const nextGoals = [...goals, draftGoal];
      await refreshGoals(nextGoals);

      setGoalInput('');
      setDraftTitle('');
      setDraftCategoryLabel('');
      setQuestions([]);
      setAnswers({});
      setDraftGoal(null);
      setStep('goal');

      Alert.alert('Gespeichert', 'Dein Ziel wurde angelegt.');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Das Ziel konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAndApplyDraftGoal() {
    if (!draftGoal) return;

    try {
      setSubmitting(true);
      const nextGoals = [...goals, draftGoal];
      await refreshGoals(nextGoals);
      await applyGoalExecutionPlan(draftGoal);
      await refreshGoals(nextGoals);

      setGoalInput('');
      setDraftTitle('');
      setDraftCategoryLabel('');
      setQuestions([]);
      setAnswers({});
      setDraftGoal(null);
      setStep('goal');

      Alert.alert(
        'Gespeichert & übernommen',
        'Ziel, Habits, Todos und Kalenderblöcke wurden angelegt.'
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht vollständig übernommen werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeGoal(id: string) {
    try {
      const nextGoals = goals.filter((goal) => goal.id !== id);
      await removeGoalLinkEntry(id);
      await refreshGoals(nextGoals);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Das Ziel konnte nicht gelöscht werden.');
    }
  }

  async function applyPlanToApp(goal: PsycheGoal) {
    try {
      setSubmitting(true);
      const result = await applyGoalExecutionPlan(goal);
      await refreshGoals();

      Alert.alert(
        'Plan übernommen',
        `${result.todosAdded} Todos, ${result.habitsAdded} Habits und ${result.calendarAdded} Kalenderblöcke wurden hinzugefügt.`
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht in die App übernommen werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function changeGoalIntensity(goalId: string, delta: 1 | -1) {
    try {
      setSubmitting(true);

      const nextGoals = goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        const preset = nextPreset(goal.executionPlan?.intensityPreset ?? goal.intensityPreset, delta);
        return rebuildGoalForIntensity(goal, preset);
      });

      await refreshGoals(nextGoals);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die Intensität konnte nicht angepasst werden.');
    } finally {
      setSubmitting(false);
    }
  }

  function changeDraftIntensity(delta: 1 | -1) {
    if (!draftGoal) return;
    const preset = nextPreset(draftGoal.executionPlan?.intensityPreset ?? draftGoal.intensityPreset, delta);
    setDraftGoal(rebuildGoalForIntensity(draftGoal, preset));
  }

  function renderQuestion(question: GoalQuestion) {
    const value = answers[question.id];

    return (
      <View key={question.id} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionTitle}>{question.title}</Text>
          {question.required ? <Text style={styles.requiredBadge}>Pflicht</Text> : null}
        </View>

        {question.helpText ? <Text style={styles.helpText}>{question.helpText}</Text> : null}

        {question.type === 'text' || question.type === 'date' ? (
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={(v) => setAnswer(question.id, v)}
            placeholder={question.placeholder ?? ''}
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            autoCapitalize="sentences"
          />
        ) : null}

        {question.type === 'number' || question.type === 'scale' ? (
          <TextInput
            value={
              typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
            }
            onChangeText={(v) => setAnswer(question.id, v)}
            placeholder={
              question.type === 'scale'
                ? `${question.min ?? 1} bis ${question.max ?? 10}`
                : question.placeholder ?? ''
            }
            placeholderTextColor="rgba(255,255,255,0.35)"
            keyboardType="numeric"
            style={styles.input}
          />
        ) : null}

        {question.type === 'single_choice'
          ? question.options?.map((option) => {
              const selected = value === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setAnswer(question.id, option.id)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })
          : null}

        {question.type === 'multi_choice'
          ? question.options?.map((option) => {
              const selected = Array.isArray(value) && value.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => toggleMultiChoice(question.id, option.id)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })
          : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Psyche</Text>
          <Text style={styles.heroTitle}>Zielsystem mit echter Umsetzung</Text>
          <Text style={styles.heroText}>
            Jetzt mit intensitätsabhängigem Plan, direkter Übernahme und echter Ziel-Verknüpfung.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={GOLD} />
            <Text style={styles.centerText}>Wird geladen ...</Text>
          </View>
        ) : null}

        {!loading && step === 'goal' ? (
          <>
            <View style={styles.card}>
              <SectionTitle>Neues Ziel</SectionTitle>
              <Text style={styles.cardText}>
                Beschreibe dein Ziel möglichst konkret.
              </Text>

              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="Dein Ziel ..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
              />

              <Pressable
                style={[styles.primaryBtn, submitting && styles.disabledBtn]}
                onPress={startDynamicQuestionnaire}
                disabled={submitting}
              >
                <Text style={styles.primaryBtnText}>
                  {submitting ? 'Wird vorbereitet ...' : 'Dynamische Fragen starten'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <SectionTitle>Aktive Ziele</SectionTitle>

              {goals.length === 0 ? (
                <Text style={styles.cardText}>Noch keine Ziele vorhanden.</Text>
              ) : (
                goals.map((goal) => (
                  <View key={goal.id} style={styles.goalListItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalListTitle}>{goal.title}</Text>
                      <Text style={styles.goalListMeta}>
                        {goal.category} · bis {dayjs(goal.targetDate).format('DD.MM.YYYY')}
                      </Text>
                      <View style={{ marginTop: 8 }}>
                        <ProgressMiniBar value={goal.progress?.total ?? 0} />
                      </View>

                      <View style={styles.inlineIntensityRow}>
                        <Pressable
                          style={styles.smallBtn}
                          onPress={() => changeGoalIntensity(goal.id, -1)}
                        >
                          <Text style={styles.smallBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.inlineIntensityText}>
                          {goal.executionPlan?.intensityPreset ?? goal.intensityPreset ?? 'balanced'}
                        </Text>
                        <Pressable
                          style={styles.smallBtn}
                          onPress={() => changeGoalIntensity(goal.id, 1)}
                        >
                          <Text style={styles.smallBtnText}>+</Text>
                        </Pressable>
                      </View>

                      <View style={styles.goalActionRow}>
                        <Pressable
                          style={styles.goalActionBtn}
                          onPress={() => applyPlanToApp(goal)}
                        >
                          <Text style={styles.goalActionBtnText}>Plan übernehmen</Text>
                        </Pressable>
                      </View>
                    </View>

                    <Pressable onPress={() => removeGoal(goal.id)} hitSlop={8}>
                      <Text style={styles.deleteText}>×</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}

        {!loading && step === 'questions' ? (
          <>
            <View style={styles.card}>
              <SectionTitle>Fragen zu deinem Ziel</SectionTitle>
              <Text style={styles.goalPreviewTitle}>{draftTitle}</Text>
              <Text style={styles.goalPreviewType}>{draftCategoryLabel}</Text>
              <Text style={styles.cardText}>
                Je komplexer oder ambitionierter dein Ziel ist, desto tiefer fragt das System nach.
              </Text>
            </View>

            {questions.map(renderQuestion)}

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.secondaryBtn, styles.flexBtn]}
                onPress={() => {
                  setStep('goal');
                  setQuestions([]);
                  setAnswers({});
                  setDraftGoal(null);
                }}
              >
                <Text style={styles.secondaryBtnText}>Zurück</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryBtn, styles.flexBtn, submitting && styles.disabledBtn]}
                onPress={buildGoalPreview}
                disabled={submitting}
              >
                <Text style={styles.primaryBtnText}>
                  {submitting ? 'Wird berechnet ...' : 'Zielvorschau erstellen'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {!loading && step === 'summary' && draftGoal ? (
          <>
            <View style={styles.card}>
              <SectionTitle>Zielvorschau</SectionTitle>
              <Text style={styles.goalPreviewTitle}>{draftGoal.title}</Text>
              <Text style={styles.goalPreviewType}>{draftGoal.category}</Text>
              <Text style={styles.cardText}>{draftGoal.recommendation?.summary}</Text>
            </View>

            <View style={styles.card}>
              <SectionTitle>Intensität</SectionTitle>
              <View style={styles.inlineIntensityRow}>
                <Pressable style={styles.smallBtn} onPress={() => changeDraftIntensity(-1)}>
                  <Text style={styles.smallBtnText}>−</Text>
                </Pressable>
                <Text style={styles.inlineIntensityText}>
                  {draftGoal.executionPlan?.intensityPreset ?? draftGoal.intensityPreset ?? 'balanced'}
                </Text>
                <Pressable style={styles.smallBtn} onPress={() => changeDraftIntensity(1)}>
                  <Text style={styles.smallBtnText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.cardText}>
                Damit kannst du den Plan später auch bei bestehenden Zielen lockerer oder härter machen.
              </Text>
            </View>

            <View style={styles.card}>
              <SectionTitle>Realismus & Analyse</SectionTitle>
              <Text style={styles.cardLine}>Realismus: {draftGoal.diagnostic.realismScore}%</Text>
              <Text style={styles.cardLine}>
                Schwierigkeit: {draftGoal.diagnostic.estimatedDifficulty}
              </Text>
              <Text style={styles.cardLine}>
                Aktueller Fortschritt: {draftGoal.progress?.total ?? 0}%
              </Text>
              <Text style={styles.cardLine}>
                Ziel bis: {dayjs(draftGoal.targetDate).format('DD.MM.YYYY')}
              </Text>
              <Text style={styles.cardLine}>
                Minuten pro Woche: {draftGoal.requirements.requiredMinutesPerWeek}
              </Text>
            </View>

            <View style={styles.card}>
              <SectionTitle>Miniziele / Etappen</SectionTitle>
              {draftGoal.milestones.map((milestone) => (
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
              <SectionTitle>Konkrete Habits</SectionTitle>
              {draftGoal.executionPlan?.habits.map((habit) => (
                <View key={habit.id} style={styles.planItem}>
                  <Text style={styles.planTitle}>{habit.title}</Text>
                  <Text style={styles.planMeta}>
                    {habit.frequencyPerWeek}× pro Woche · {habit.durationMinutes} Min ·{' '}
                    {habit.difficulty}
                  </Text>
                  <Text style={styles.planReason}>{habit.reason}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <SectionTitle>Konkrete Todos</SectionTitle>
              {draftGoal.executionPlan?.todos.map((todo) => (
                <View key={todo.id} style={styles.planItem}>
                  <Text style={styles.planTitle}>{todo.title}</Text>
                  <Text style={styles.planMeta}>
                    Priorität: {todo.priority}
                    {todo.estimatedMinutes ? ` · ${todo.estimatedMinutes} Min` : ''}
                  </Text>
                  <Text style={styles.planReason}>{todo.reason}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <SectionTitle>Kalenderblöcke</SectionTitle>
              {draftGoal.executionPlan?.calendarBlocks.map((block) => (
                <View key={block.id} style={styles.planItem}>
                  <Text style={styles.planTitle}>{block.title}</Text>
                  <Text style={styles.planMeta}>
                    {block.dayLabel} · {block.startTime} · {block.durationMinutes} Min
                  </Text>
                  <Text style={styles.planReason}>{block.reason}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.secondaryBtn, styles.flexBtn]}
                onPress={() => setStep('questions')}
              >
                <Text style={styles.secondaryBtnText}>Fragen anpassen</Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryBtn, styles.flexBtn, submitting && styles.disabledBtn]}
                onPress={saveDraftGoal}
                disabled={submitting}
              >
                <Text style={styles.secondaryBtnText}>
                  {submitting ? 'Speichert ...' : 'Nur speichern'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryBtn, submitting && styles.disabledBtn]}
              onPress={saveAndApplyDraftGoal}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? 'Übernimmt ...' : 'Speichern + direkt übernehmen'}
              </Text>
            </Pressable>
          </>
        ) : null}

        {!loading && step === 'goal' && latestGoal ? (
          <View style={styles.card}>
            <SectionTitle>Letztes Ziel</SectionTitle>
            <Text style={styles.goalPreviewTitle}>{latestGoal.title}</Text>
            <Text style={styles.cardLine}>Fortschritt: {latestGoal.progress?.total ?? 0}%</Text>
            <Text style={styles.cardLine}>Level: {latestGoal.progress?.level ?? 1}</Text>
            <Text style={styles.cardLine}>Trend: {latestGoal.progress?.trend ?? 'steady'}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PSYCHE_THEME.bg },
  content: { padding: 16, paddingBottom: 44, gap: 14 },
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
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: { color: PSYCHE_THEME.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroText: { color: PSYCHE_THEME.muted, fontSize: 14, lineHeight: 20 },
  centerBox: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { color: PSYCHE_THEME.text, fontSize: 14 },
  card: {
    backgroundColor: PSYCHE_THEME.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  sectionTitle: { color: PSYCHE_THEME.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  cardText: { color: PSYCHE_THEME.muted, fontSize: 14, lineHeight: 20 },
  cardLine: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 22 },
  input: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: PSYCHE_THEME.text,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#162033', fontSize: 14, fontWeight: '800' },
  secondaryBtnText: { color: PSYCHE_THEME.text, fontSize: 14, fontWeight: '700' },
  questionCard: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  questionTitle: {
    flex: 1,
    color: PSYCHE_THEME.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  requiredBadge: { color: GOLD, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  helpText: { color: PSYCHE_THEME.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  option: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionSelected: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: 'rgba(212,175,55,0.35)',
  },
  optionText: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 20 },
  optionTextSelected: { color: GOLD, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },
  goalListItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  goalListTitle: { color: PSYCHE_THEME.text, fontSize: 15, fontWeight: '700' },
  goalListMeta: { color: PSYCHE_THEME.muted, fontSize: 12, marginTop: 3 },
  deleteText: { color: '#FF8C8C', fontSize: 28, lineHeight: 28, marginTop: -2 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: GOLD, borderRadius: 999 },
  goalPreviewTitle: { color: PSYCHE_THEME.text, fontSize: 20, fontWeight: '800' },
  goalPreviewType: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 8,
  },
  inlineIntensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  inlineIntensityText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: PSYCHE_THEME.text, fontSize: 18, fontWeight: '800' },
  goalActionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  goalActionBtn: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  goalActionBtnText: { color: GOLD, fontSize: 13, fontWeight: '800' },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  milestoneTitle: { color: PSYCHE_THEME.text, fontSize: 14, fontWeight: '700' },
  milestoneDesc: { color: PSYCHE_THEME.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  milestoneMeta: { color: GOLD, fontSize: 13, fontWeight: '700' },
  planItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  planTitle: { color: PSYCHE_THEME.text, fontSize: 14, fontWeight: '700' },
  planMeta: { color: GOLD, fontSize: 12, fontWeight: '700', marginTop: 3 },
  planReason: { color: PSYCHE_THEME.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
});