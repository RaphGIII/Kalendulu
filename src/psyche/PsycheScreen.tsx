import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { GOLD, PSYCHE_THEME } from './styles';
import {
  loadPsycheGoals,
  loadPsycheHistory,
  savePsycheGoals,
  savePsycheHistory,
} from './storage';
import {
  loadCalendarEventsBestEffort,
  loadHabitsState,
  loadTodoStateBestEffort,
} from './adapters';
import { computeSignals } from './engine/computeSignals';
import { buildProfile } from './engine/buildProfile';
import { fetchGoalRefinement } from './refinementApi';
import { fetchPlannerBundle } from './plannerApi';
import { buildUserPlanningProfile } from './buildUserPlanningProfile';
import { buildFreeSlots } from './buildFreeSlots';
import {
  applyTodoSuggestion,
  applyHabitSuggestion,
  applyCalendarSuggestion,
  applyRoutineSuggestion,
} from './applySuggestion';

import type {
  GoalAnswerMap,
  GoalQuestion,
  GoalRefinementResponse,
  PlannerBundle,
  PlannerRoutine,
  PsycheDailySnapshot,
  PsycheGoal,
} from './types';

dayjs.locale('de');

type Step = 'goal' | 'questions' | 'plan';

export default function PsycheScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [goals, setGoals] = useState<PsycheGoal[]>([]);
  const [goalInput, setGoalInput] = useState('');
  const [history, setHistory] = useState<PsycheDailySnapshot[]>([]);

  const [step, setStep] = useState<Step>('goal');
  const [refinement, setRefinement] = useState<GoalRefinementResponse | null>(null);
  const [answers, setAnswers] = useState<GoalAnswerMap>({});
  const [planner, setPlanner] = useState<PlannerBundle | null>(null);

  const [expandedReasonIds, setExpandedReasonIds] = useState<Record<string, boolean>>({});

  const latestGoal = useMemo(() => goals[goals.length - 1] ?? null, [goals]);

  useEffect(() => {
    (async () => {
      try {
        const [storedGoals, storedHistory] = await Promise.all([
          loadPsycheGoals(),
          loadPsycheHistory(),
        ]);

        setGoals(storedGoals);
        setHistory(storedHistory);

        let nextHistory = storedHistory;

        const hasToday = storedHistory.some(
          (item) => item.dateKey === dayjs().format('YYYY-MM-DD')
        );

        if (!hasToday) {
          const habits = await loadHabitsState();
          const todo = await loadTodoStateBestEffort();
          const calendarEvents = await loadCalendarEventsBestEffort();

          const histSignals = storedHistory.map((x) => x.signals);
          const signals = computeSignals({
            habits,
            todo,
            calendarEvents,
            historySignals: histSignals,
          });

          const profile = buildProfile(signals);

          const snap: PsycheDailySnapshot = {
            dateKey: dayjs().format('YYYY-MM-DD'),
            signals,
            profile,
          };

          nextHistory = [...storedHistory, snap].slice(
            Math.max(0, storedHistory.length + 1 - 30)
          );

          setHistory(nextHistory);
          await savePsycheHistory(nextHistory);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Fehler', 'Der Psyche-Tab konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refreshSnapshot(existingHistory?: PsycheDailySnapshot[]) {
    const currentHistory = existingHistory ?? history;

    const habits = await loadHabitsState();
    const todo = await loadTodoStateBestEffort();
    const calendarEvents = await loadCalendarEventsBestEffort();

    const histSignals = currentHistory.map((h) => h.signals);
    const signals = computeSignals({
      habits,
      todo,
      calendarEvents,
      historySignals: histSignals,
    });

    const profile = buildProfile(signals);

    const snap: PsycheDailySnapshot = {
      dateKey: dayjs().format('YYYY-MM-DD'),
      signals,
      profile,
    };

    const next = [...currentHistory];
    const idx = next.findIndex((x) => x.dateKey === snap.dateKey);

    if (idx >= 0) next[idx] = snap;
    else next.push(snap);

    const trimmed = next.slice(Math.max(0, next.length - 30));

    setHistory(trimmed);
    await savePsycheHistory(trimmed);

    return snap;
  }

  async function addGoal() {
    const title = goalInput.trim();
    if (!title) return;

    try {
      setSubmitting(true);

      const nextGoals: PsycheGoal[] = [...goals, { id: `${Date.now()}`, title }];
      setGoals(nextGoals);
      setGoalInput('');
      await savePsycheGoals(nextGoals);

      const habits = await loadHabitsState();
      const todo = await loadTodoStateBestEffort();
      const calendarEvents = await loadCalendarEventsBestEffort();

      const userPlanningProfile = buildUserPlanningProfile({
        goals: nextGoals,
        todo,
        habits,
        calendarEvents,
      });

      const refine = await fetchGoalRefinement({
        goal: title,
        pastGoals: nextGoals,
        profile: userPlanningProfile,
      });

      setRefinement(refine);
      setAnswers({});
      setPlanner(null);
      setExpandedReasonIds({});
      setStep('questions');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die Fragen konnten nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeGoal(id: string) {
    const nextGoals = goals.filter((goal) => goal.id !== id);
    setGoals(nextGoals);
    await savePsycheGoals(nextGoals);

    if (nextGoals.length === 0) {
      setPlanner(null);
      setRefinement(null);
      setAnswers({});
      setExpandedReasonIds({});
      setStep('goal');
    }
  }

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  function toggleMultiChoice(questionId: string, optionId: string) {
    const existing = answers[questionId];
    const current = Array.isArray(existing) ? existing : [];
    const hasOption = current.includes(optionId);

    const next = hasOption
      ? current.filter((x) => x !== optionId)
      : [...current, optionId];

    setAnswer(questionId, next);
  }

  function isQuestionAnswered(question: GoalQuestion) {
    const value = answers[question.id];

    if (question.type === 'text') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (question.type === 'single_choice') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    if (question.type === 'multi_choice') {
      return Array.isArray(value) && value.length > 0;
    }

    return false;
  }

  function validateRequiredQuestions() {
    if (!refinement) return true;

    const missing = refinement.questions.filter(
      (q) => q.required && !isQuestionAnswered(q)
    );

    if (missing.length > 0) {
      Alert.alert(
        'Noch unvollständig',
        'Bitte beantworte zuerst alle Pflichtfragen.'
      );
      return false;
    }

    return true;
  }

  async function generatePlan() {
    if (!refinement) return;
    if (!validateRequiredQuestions()) return;

    try {
      setSubmitting(true);

      let latestSnap = history[history.length - 1] ?? null;
      if (!latestSnap) {
        latestSnap = await refreshSnapshot(history);
      }

      if (!latestSnap) {
        throw new Error('No snapshot available');
      }

      const habits = await loadHabitsState();
      const todo = await loadTodoStateBestEffort();
      const calendarEvents = (await loadCalendarEventsBestEffort()) ?? [];
      const freeSlots = buildFreeSlots(calendarEvents, {
        startTomorrow: true,
        daysAhead: 7,
        minDurationMinutes: 20,
      });

      const userPlanningProfile = buildUserPlanningProfile({
        goals,
        todo,
        habits,
        calendarEvents,
      });

      const result = await fetchPlannerBundle({
        goals,
        profile: latestSnap.profile,
        signals: latestSnap.signals,
        freeSlots,
        answers,
        userPlanningProfile,
      });

      setPlanner(result);
      setExpandedReasonIds({});
      setStep('plan');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyPrimary() {
    if (!planner) return;

    try {
      setSubmitting(true);

      await applyTodoSuggestion(planner.primary.todo.title);
      await applyHabitSuggestion(planner.primary.habit.title);
      await applyCalendarSuggestion(
        planner.primary.calendar.title,
        planner.primary.calendar.start,
        planner.primary.calendar.end
      );

      for (const routine of planner.primary.routines) {
        await applyRoutineSuggestion(routine);
      }

      Alert.alert('Übernommen', 'Plan und Routinen wurden hinzugefügt.');
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Der Plan konnte nicht übernommen werden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyAlternative(index: number) {
    if (!planner) return;
    const alt = planner.alternatives[index];
    if (!alt) return;

    try {
      setSubmitting(true);

      await applyTodoSuggestion(alt.todo.title);
      await applyHabitSuggestion(alt.habit.title);
      await applyCalendarSuggestion(
        alt.calendar.title,
        alt.calendar.start,
        alt.calendar.end
      );

      Alert.alert('Übernommen', `Alternative "${alt.label}" wurde hinzugefügt.`);
    } catch (error) {
      console.error(error);
      Alert.alert('Fehler', 'Die Alternative konnte nicht übernommen werden.');
    } finally {
      setSubmitting(false);
    }
  }

  function backToQuestions() {
    setStep('questions');
  }

  function startNewGoal() {
    setRefinement(null);
    setAnswers({});
    setPlanner(null);
    setExpandedReasonIds({});
    setStep('goal');
  }

  function toggleReason(id: string) {
    setExpandedReasonIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function renderQuestion(question: GoalQuestion) {
    const value = answers[question.id];

    return (
      <View key={question.id} style={styles.questionWrap}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionTitle}>{question.title}</Text>
          {question.required ? <Text style={styles.requiredMark}>Pflicht</Text> : null}
        </View>

        {question.type === 'text' ? (
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={(v) => setAnswer(question.id, v)}
            placeholder={question.placeholder ?? ''}
            placeholderTextColor="rgba(255,255,255,0.38)"
            style={styles.input}
            multiline
          />
        ) : null}

        {question.type === 'single_choice'
          ? question.options?.map((option) => {
              const selected = value === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setAnswer(question.id, option.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })
          : null}

        {question.type === 'multi_choice'
          ? question.options?.map((option) => {
              const selected =
                Array.isArray(value) && value.includes(option.id);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => toggleMultiChoice(question.id, option.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })
          : null}
      </View>
    );
  }

  function renderReasonCard(
    id: string,
    title: string,
    reason: string,
    instruction?: string,
    expectedEffect?: string,
    extra?: React.ReactNode
  ) {
    const expanded = !!expandedReasonIds[id];

    return (
      <Pressable onPress={() => toggleReason(id)} style={styles.ideaCard}>
        <Text style={styles.ideaTitle}>{title}</Text>
        {extra}
        <Text style={styles.tapHint}>
          {expanded ? 'Erklärung ausblenden' : 'Warum wichtig?'}
        </Text>

        {expanded ? (
          <View style={styles.explainerWrap}>
            <Text style={styles.reasonText}>{reason}</Text>
            {instruction ? (
              <Text style={styles.instructionText}>Anweisung: {instruction}</Text>
            ) : null}
            {expectedEffect ? (
              <Text style={styles.effectText}>Wirkung: {expectedEffect}</Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );
  }

  function renderRoutine(routine: PlannerRoutine, index: number) {
    const id = `routine-${index}`;
    const expanded = !!expandedReasonIds[id];

    return (
      <View key={`${routine.title}-${index}`} style={styles.card}>
        <Pressable onPress={() => toggleReason(id)}>
          <Text style={styles.cardTitle}>{routine.title}</Text>
          <Text style={styles.routineMeta}>
            {routine.frequencyPerWeek}x pro Woche
          </Text>
          <Text style={styles.tapHint}>
            {expanded ? 'Erklärung ausblenden' : 'Warum diese Routine?'}
          </Text>

          {expanded ? (
            <View style={styles.explainerWrap}>
              <Text style={styles.reasonText}>{routine.reason}</Text>
              {routine.instruction ? (
                <Text style={styles.instructionText}>
                  Anweisung: {routine.instruction}
                </Text>
              ) : null}
              {routine.reviewAfterDays ? (
                <Text style={styles.effectText}>
                  Nach {routine.reviewAfterDays} Tagen Wirkung prüfen.
                </Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>

        <View style={styles.routineBlocksWrap}>
          {routine.blocks.map((block, blockIndex) => (
            <View key={`${block.title}-${blockIndex}`} style={styles.routineBlock}>
              <Text style={styles.routineBlockTitle}>{block.title}</Text>
              <Text style={styles.routineBlockTime}>
                {dayjs(block.start).format('dd DD.MM. HH:mm')} –{' '}
                {dayjs(block.end).format('HH:mm')}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Psyche</Text>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator />
        </View>
      ) : null}

      {!loading && step === 'goal' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ziel</Text>

            <View style={styles.inputRow}>
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="Was möchtest du verändern?"
                placeholderTextColor="rgba(255,255,255,0.38)"
                style={styles.inputSingleLine}
                onSubmitEditing={addGoal}
                returnKeyType="done"
              />
              <Pressable
                onPress={addGoal}
                style={styles.addButton}
                disabled={submitting}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {goals.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bisherige Ziele</Text>
              <View style={styles.goalList}>
                {goals.map((goal) => (
                  <View key={goal.id} style={styles.goalChip}>
                    <Text style={styles.goalChipText}>{goal.title}</Text>
                    <Pressable onPress={() => removeGoal(goal.id)} hitSlop={8}>
                      <Text style={styles.goalChipRemove}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {!loading && step === 'questions' && refinement ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.headerFlex}>
              <Text style={styles.cardTitle}>{refinement.goalLabel}</Text>
              <Text style={styles.goalTypeBadge}>{refinement.goalType}</Text>
            </View>

            <Pressable onPress={startNewGoal} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Neues Ziel</Text>
            </Pressable>
          </View>

          <View style={styles.questionsBlock}>
            {refinement.questions.map(renderQuestion)}
          </View>

          <Pressable
            style={styles.generateButton}
            onPress={generatePlan}
            disabled={submitting}
          >
            <Text style={styles.generateButtonText}>
              {submitting ? 'Wird erstellt ...' : 'Plan erstellen'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && step === 'plan' && planner ? (
        <>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.headerFlex}>
                <Text style={styles.cardTitle}>{latestGoal?.title ?? 'Plan'}</Text>
                {refinement?.goalType ? (
                  <Text style={styles.goalTypeBadge}>{refinement.goalType}</Text>
                ) : null}
              </View>

              <Pressable onPress={backToQuestions} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Anpassen</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hauptplan</Text>

            {renderReasonCard(
              'primary-todo',
              `Todo: ${planner.primary.todo.title}`,
              planner.primary.todo.reason,
              planner.primary.todo.instruction,
              planner.primary.todo.expectedEffect
            )}

            {renderReasonCard(
              'primary-habit',
              `Habit: ${planner.primary.habit.title}`,
              planner.primary.habit.reason,
              planner.primary.habit.instruction,
              planner.primary.habit.expectedEffect
            )}

            {renderReasonCard(
              'primary-calendar',
              `Termin: ${planner.primary.calendar.title}`,
              planner.primary.calendar.reason,
              planner.primary.calendar.instruction,
              undefined,
              <Text style={styles.timeText}>
                {dayjs(planner.primary.calendar.start).format('dd DD.MM. HH:mm')} –{' '}
                {dayjs(planner.primary.calendar.end).format('HH:mm')}
              </Text>
            )}

            {planner.primary.scheduleAdjustment
              ? renderReasonCard(
                  'primary-schedule-adjustment',
                  `Zeitplan anpassen: ${planner.primary.scheduleAdjustment.title}`,
                  planner.primary.scheduleAdjustment.reason,
                  planner.primary.scheduleAdjustment.instruction,
                  planner.primary.scheduleAdjustment.expectedEffect
                )
              : null}

            {planner.primary.review ? (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>
                  Wirkung nach {planner.primary.review.reviewAfterDays} Tagen prüfen
                </Text>
                {planner.primary.review.questions.map((q, i) => (
                  <Text key={`${q}-${i}`} style={styles.reviewQuestion}>
                    {i + 1}. {q}
                  </Text>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={handleApplyPrimary}
              style={[styles.applyAllButton, submitting && styles.buttonDisabled]}
              disabled={submitting}
            >
              <Text style={styles.applyAllButtonText}>
                {submitting ? 'Wird übernommen ...' : 'Hauptplan übernehmen'}
              </Text>
            </Pressable>
          </View>

          {planner.primary.routines.length > 0 ? (
            <View style={styles.groupWrap}>
              <Text style={styles.groupTitle}>Routinen</Text>
              {planner.primary.routines.map(renderRoutine)}
            </View>
          ) : null}

          {planner.alternatives.length > 0 ? (
            <View style={styles.groupWrap}>
              <Text style={styles.groupTitle}>Andere Richtungen</Text>

              {planner.alternatives.map((alt, index) => (
                <View key={`${alt.label}-${index}`} style={styles.card}>
                  <Text style={styles.altLabel}>{alt.label}</Text>

                  {renderReasonCard(
                    `alt-${index}-todo`,
                    `Todo: ${alt.todo.title}`,
                    alt.todo.reason,
                    alt.todo.instruction,
                    alt.todo.expectedEffect
                  )}

                  {renderReasonCard(
                    `alt-${index}-habit`,
                    `Habit: ${alt.habit.title}`,
                    alt.habit.reason,
                    alt.habit.instruction,
                    alt.habit.expectedEffect
                  )}

                  {renderReasonCard(
                    `alt-${index}-calendar`,
                    `Termin: ${alt.calendar.title}`,
                    alt.calendar.reason,
                    alt.calendar.instruction,
                    undefined,
                    <Text style={styles.timeText}>
                      {dayjs(alt.calendar.start).format('dd DD.MM. HH:mm')} –{' '}
                      {dayjs(alt.calendar.end).format('HH:mm')}
                    </Text>
                  )}

                  <Pressable
                    onPress={() => handleApplyAlternative(index)}
                    style={[styles.secondaryWideButton, submitting && styles.buttonDisabled]}
                    disabled={submitting}
                  >
                    <Text style={styles.secondaryWideButtonText}>
                      Diese Richtung übernehmen
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={startNewGoal}
            style={[styles.ghostButton, submitting && styles.buttonDisabled]}
            disabled={submitting}
          >
            <Text style={styles.ghostButtonText}>Neues Ziel starten</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PSYCHE_THEME.bgDark,
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    color: PSYCHE_THEME.text,
    fontSize: 30,
    fontWeight: '900',
  },
  card: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  sectionTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 20,
    fontWeight: '900',
  },
  cardTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 18,
    fontWeight: '900',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerFlex: {
    flex: 1,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  inputSingleLine: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    fontWeight: '700',
    marginTop: 8,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#0B1636',
    fontSize: 26,
    fontWeight: '900',
    marginTop: -2,
  },
  goalList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  goalChipText: {
    color: '#fff',
    fontWeight: '800',
  },
  goalChipRemove: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  questionsBlock: {
    marginTop: 16,
    gap: 14,
  },
  questionWrap: {
    gap: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  questionTitle: {
    color: '#fff',
    fontWeight: '800',
    flex: 1,
    lineHeight: 20,
  },
  requiredMark: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
  },
  option: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.18)',
  },
  optionText: {
    color: '#fff',
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '900',
  },
  generateButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#0B1636',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  secondaryWideButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryWideButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  ghostButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '800',
  },
  goalTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(212,175,55,0.18)',
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  groupWrap: {
    gap: 12,
  },
  groupTitle: {
    color: PSYCHE_THEME.text,
    fontSize: 18,
    fontWeight: '900',
  },
  altLabel: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 12,
  },
  ideaCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  ideaTitle: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  timeText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '700',
  },
  tapHint: {
    marginTop: 8,
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
  },
  explainerWrap: {
    marginTop: 8,
    gap: 8,
  },
  reasonText: {
    color: '#fff',
    lineHeight: 21,
    fontWeight: '700',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 20,
    fontWeight: '700',
  },
  effectText: {
    color: GOLD,
    lineHeight: 20,
    fontWeight: '800',
  },
  routineMeta: {
    marginTop: 8,
    color: GOLD,
    fontSize: 13,
    fontWeight: '900',
  },
  routineBlocksWrap: {
    marginTop: 14,
    gap: 10,
  },
  routineBlock: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  routineBlockTitle: {
    color: '#fff',
    fontWeight: '800',
  },
  routineBlockTime: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '700',
  },
  reviewCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  reviewTitle: {
    color: GOLD,
    fontWeight: '900',
    marginBottom: 8,
  },
  reviewQuestion: {
    color: '#fff',
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 4,
  },
  applyAllButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyAllButtonText: {
    color: '#0B1636',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loaderWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});