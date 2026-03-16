import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { useFocusEffect } from '@react-navigation/native';

import {
  GoalMiniStep,
  GoalMiniStepStatus,
  PlannerExecutionChecklistItem,
  PlannerExecutionStep,
  PsycheGoal,
} from '../psyche/types';
import { loadPsycheGoals, savePsycheGoals } from '../psyche/storage';

dayjs.locale('de');

const BG = '#2B1D14';
const BG_SOFT = '#3A281C';
const CARD = '#4A3426';
const CARD_LIGHT = '#5B4030';
const CARD_DARK = '#3A281C';
const TEXT = '#FFF8EE';
const MUTED = 'rgba(255,248,238,0.72)';
const BORDER = 'rgba(255,248,238,0.10)';
const GOLD = '#D9B26B';
const GREEN = '#7EDB7A';
const RED = '#FF8F8F';

type Props = {
  navigation?: {
    navigate?: (screen: string, params?: Record<string, unknown>) => void;
  };
};

type ManualStepCategoryId =
  | 'focus'
  | 'training'
  | 'nutrition'
  | 'study'
  | 'admin'
  | 'review'
  | 'custom';

type ManualGoalCategoryId =
  | 'fitness'
  | 'study'
  | 'business'
  | 'music'
  | 'project'
  | 'other';

type ManualStep = GoalMiniStep & {
  category?: ManualStepCategoryId;
  color?: string;
  note?: string;
  source?: 'manual';
};

const STEP_CATEGORIES: Array<{
  id: ManualStepCategoryId;
  label: string;
  color: string;
  bg: string;
}> = [
  { id: 'focus', label: 'Fokus', color: '#8FD3FF', bg: 'rgba(143,211,255,0.16)' },
  { id: 'training', label: 'Training', color: '#7EDB7A', bg: 'rgba(126,219,122,0.16)' },
  { id: 'nutrition', label: 'Ernährung', color: '#FFC16B', bg: 'rgba(255,193,107,0.16)' },
  { id: 'study', label: 'Lernen', color: '#C6A2FF', bg: 'rgba(198,162,255,0.16)' },
  { id: 'admin', label: 'Planung', color: '#FF9CC7', bg: 'rgba(255,156,199,0.16)' },
  { id: 'review', label: 'Review', color: '#9BE7D8', bg: 'rgba(155,231,216,0.16)' },
  { id: 'custom', label: 'Custom', color: '#D9B26B', bg: 'rgba(217,178,107,0.16)' },
];

const GOAL_CATEGORIES: Array<{
  id: ManualGoalCategoryId;
  label: string;
  color: string;
  bg: string;
}> = [
  { id: 'fitness', label: 'Fitness', color: '#7EDB7A', bg: 'rgba(126,219,122,0.16)' },
  { id: 'study', label: 'Lernen', color: '#C6A2FF', bg: 'rgba(198,162,255,0.16)' },
  { id: 'business', label: 'Business', color: '#FFB870', bg: 'rgba(255,184,112,0.16)' },
  { id: 'music', label: 'Musik', color: '#8FD3FF', bg: 'rgba(143,211,255,0.16)' },
  { id: 'project', label: 'Projekt', color: '#FF9CC7', bg: 'rgba(255,156,199,0.16)' },
  { id: 'other', label: 'Andere', color: GOLD, bg: 'rgba(217,178,107,0.16)' },
];

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getStepCategoryMeta(category?: string) {
  return STEP_CATEGORIES.find((item) => item.id === category) ?? STEP_CATEGORIES[0];
}

function getGoalCategoryMeta(category?: string) {
  return (
    GOAL_CATEGORIES.find((item) => item.id === category) ??
    GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1]
  );
}

function getManualSteps(goal: PsycheGoal): ManualStep[] {
  const raw = goal.manualSteps;
  return Array.isArray(raw) ? (raw as ManualStep[]) : [];
}

function getAiSteps(goal: PsycheGoal): PlannerExecutionStep[] {
  if (Array.isArray(goal.executionPlan?.steps)) {
    return goal.executionPlan.steps;
  }
  return [];
}

function toMiniStepStatus(done: boolean): GoalMiniStepStatus {
  return done ? 'done' : 'active';
}

function buildMiniStepsFromManual(steps: ManualStep[]): GoalMiniStep[] {
  return steps.map((step, index) => ({
    id: step.id,
    order: index + 1,
    title: step.title,
    description: step.description,
    done: !!step.done,
    status: toMiniStepStatus(!!step.done),
  }));
}

function computeGoalProgress(goal: PsycheGoal) {
  const manualSteps = getManualSteps(goal);
  const aiSteps = getAiSteps(goal);

  const manualTotal = manualSteps.length;
  const manualDone = manualSteps.filter((step) => step.done).length;

  const aiChecklist = aiSteps.flatMap((step) => step.checklist ?? []);
  const aiTotal = aiChecklist.length;
  const aiDone = aiChecklist.filter((item) => item.done).length;

  const total = manualTotal + aiTotal;
  if (!total) return 0;

  return Math.round(((manualDone + aiDone) / total) * 100);
}

function isAiStepComplete(step: PlannerExecutionStep) {
  const checklist = step.checklist ?? [];
  return checklist.length > 0 && checklist.every((item) => item.done);
}

function GoalProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamp(value, 0, 100)}%` }]} />
    </View>
  );
}

function GoalCard({
  goal,
  onOpen,
}: {
  goal: PsycheGoal;
  onOpen: () => void;
}) {
  const progress = computeGoalProgress(goal);
  const manualCount = getManualSteps(goal).length;
  const aiCount = getAiSteps(goal).length;
  const categoryMeta = getGoalCategoryMeta(String(goal.category));

  return (
    <Pressable onPress={onOpen} style={styles.goalCard}>
      <View style={styles.goalTopRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={styles.goalTopMetaRow}>
            <View
              style={[
                styles.goalTypeBadge,
                {
                  backgroundColor: categoryMeta.bg,
                  borderColor: `${categoryMeta.color}55`,
                },
              ]}
            >
              <Text style={[styles.goalTypeBadgeText, { color: categoryMeta.color }]}>
                {categoryMeta.label}
              </Text>
            </View>
            <Text style={styles.goalTinyMeta}>
              {manualCount} eigene · {aiCount} KI
            </Text>
          </View>

          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalMeta}>
            Ziel bis {dayjs(goal.targetDate).format('DD.MM.YYYY')}
          </Text>
        </View>

        <Text style={styles.goalPercent}>{progress}%</Text>
      </View>

      <GoalProgressBar value={progress} />
    </Pressable>
  );
}

function ManualStepRow({
  step,
  onToggle,
  onDelete,
}: {
  step: ManualStep;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = getStepCategoryMeta(step.category);

  return (
    <View style={styles.stepRowWrap}>
      <View style={[styles.stepAccent, { backgroundColor: meta.color }]} />

      <Pressable onPress={onToggle} style={[styles.stepRow, step.done && styles.stepRowDone]}>
        <View style={styles.stepMain}>
          <View style={styles.stepTopLine}>
            <View
              style={[
                styles.stepCategoryBadge,
                {
                  backgroundColor: meta.bg,
                  borderColor: `${meta.color}55`,
                },
              ]}
            >
              <Text style={[styles.stepCategoryText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
            <Text style={styles.stepStateText}>{step.done ? 'Erledigt' : 'Offen'}</Text>
          </View>

          <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]}>
            {step.title}
          </Text>

          {!!step.note && (
            <Text style={[styles.stepNote, step.done && styles.stepNoteDone]}>
              {step.note}
            </Text>
          )}
        </View>

        <View style={[styles.checkCircle, step.done && styles.checkCircleDone]}>
          {step.done ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable onPress={onDelete} style={styles.deleteMiniBtn}>
        <Text style={styles.deleteMiniBtnText}>Löschen</Text>
      </Pressable>
    </View>
  );
}

function AiChecklistRow({
  item,
  onToggle,
}: {
  item: PlannerExecutionChecklistItem;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.aiCheckRow, item.done && styles.aiCheckRowDone]}
    >
      <View style={[styles.checkCircle, item.done && styles.checkCircleDone]}>
        {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={[styles.aiCheckText, item.done && styles.aiCheckTextDone]}>{item.label}</Text>
    </Pressable>
  );
}

export default function ProgressScreen({ navigation }: Props) {
  const [goals, setGoals] = useState<PsycheGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<ManualGoalCategoryId>('other');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState(
    dayjs().add(90, 'day').format('YYYY-MM-DD'),
  );

  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepNote, setNewStepNote] = useState('');
  const [newStepCategory, setNewStepCategory] = useState<ManualStepCategoryId>('focus');

  const reloadGoals = useCallback(async () => {
    const storedGoals = await loadPsycheGoals();
    const normalized = storedGoals.map((goal) => ({
      ...goal,
      progressPercent: computeGoalProgress(goal),
    }));
    setGoals(normalized);

    setSelectedGoalId((prev) => {
      if (!prev) return prev;
      return normalized.some((goal) => goal.id === prev) ? prev : null;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadGoals();
    }, [reloadGoals]),
  );

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  async function persistGoals(nextGoals: PsycheGoal[]) {
    setGoals(nextGoals);
    await savePsycheGoals(nextGoals);
  }

  async function handleCreateGoal() {
    const trimmed = newGoalTitle.trim();
    if (!trimmed) return;

    const targetDateIso = dayjs(newGoalTargetDate, 'YYYY-MM-DD', true).isValid()
      ? dayjs(newGoalTargetDate).endOf('day').toISOString()
      : dayjs().add(90, 'day').endOf('day').toISOString();

    const newGoal: PsycheGoal = {
      id: uid('goal'),
      title: trimmed,
      category: newGoalCategory,
      difficultyLevel: 1,
      targetDate: targetDateIso,
      createdAt: new Date().toISOString(),
      why: '',
      answers: {},
      recommendation: {
        summary: 'Manuell im Fortschritt-Tab erstellt.',
      },
      miniSteps: [],
      executionPlan: {
        summary: 'Eigenes Ziel mit manuellen Steps.',
        todos: [],
        habits: [],
        calendarBlocks: [],
        steps: [],
      },
      progressPercent: 0,
      appliedToApp: false,
      questionCount: 0,
      manualSteps: [],
      source: 'manual',
    };

    const nextGoals = [newGoal, ...goals];
    await persistGoals(nextGoals);

    setNewGoalTitle('');
    setNewGoalCategory('other');
    setNewGoalTargetDate(dayjs().add(90, 'day').format('YYYY-MM-DD'));
    setSelectedGoalId(newGoal.id);
  }

  async function handleDeleteGoal(goalId: string) {
    const nextGoals = goals.filter((goal) => goal.id !== goalId);
    await persistGoals(nextGoals);
    if (selectedGoalId === goalId) {
      setSelectedGoalId(null);
    }
  }

  async function handleAddManualStep() {
    if (!selectedGoal) return;

    const trimmed = newStepTitle.trim();
    if (!trimmed) return;

    const categoryMeta = getStepCategoryMeta(newStepCategory);
    const currentSteps = getManualSteps(selectedGoal);

    const newStep: ManualStep = {
      id: uid('manual_step'),
      order: currentSteps.length + 1,
      title: trimmed,
      description: trimmed,
      note: newStepNote.trim(),
      done: false,
      status: 'active',
      category: newStepCategory,
      color: categoryMeta.color,
      source: 'manual',
    };

    const nextManualSteps: ManualStep[] = [...currentSteps, newStep];

    const nextGoal: PsycheGoal = {
      ...selectedGoal,
      manualSteps: nextManualSteps,
      miniSteps:
        !getAiSteps(selectedGoal).length
          ? buildMiniStepsFromManual(nextManualSteps)
          : selectedGoal.miniSteps,
      progressPercent: computeGoalProgress({
        ...selectedGoal,
        manualSteps: nextManualSteps,
      } as PsycheGoal),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);

    setNewStepTitle('');
    setNewStepNote('');
    setNewStepCategory('focus');
  }

  async function handleToggleManualStep(stepId: string) {
    if (!selectedGoal) return;

    const currentSteps = getManualSteps(selectedGoal);
    const nextManualSteps: ManualStep[] = currentSteps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            done: !step.done,
            status: toMiniStepStatus(!step.done),
          }
        : step,
    );

    const nextGoal: PsycheGoal = {
      ...selectedGoal,
      manualSteps: nextManualSteps,
      miniSteps:
        !getAiSteps(selectedGoal).length
          ? buildMiniStepsFromManual(nextManualSteps)
          : selectedGoal.miniSteps,
      progressPercent: computeGoalProgress({
        ...selectedGoal,
        manualSteps: nextManualSteps,
      } as PsycheGoal),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);
  }

  async function handleDeleteManualStep(stepId: string) {
    if (!selectedGoal) return;

    const nextManualSteps: ManualStep[] = getManualSteps(selectedGoal)
      .filter((step) => step.id !== stepId)
      .map((step, index) => ({
        ...step,
        order: index + 1,
      }));

    const nextGoal: PsycheGoal = {
      ...selectedGoal,
      manualSteps: nextManualSteps,
      miniSteps:
        !getAiSteps(selectedGoal).length
          ? buildMiniStepsFromManual(nextManualSteps)
          : selectedGoal.miniSteps,
      progressPercent: computeGoalProgress({
        ...selectedGoal,
        manualSteps: nextManualSteps,
      } as PsycheGoal),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);
  }

  async function handleToggleAiChecklist(stepId: string, itemId: string) {
    if (!selectedGoal || !selectedGoal.executionPlan) return;

    const nextSteps = getAiSteps(selectedGoal).map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        checklist: (step.checklist ?? []).map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item,
        ),
      };
    });

    const nextGoal: PsycheGoal = {
      ...selectedGoal,
      executionPlan: {
        ...selectedGoal.executionPlan,
        steps: nextSteps,
      },
      progressPercent: computeGoalProgress({
        ...selectedGoal,
        executionPlan: {
          ...selectedGoal.executionPlan,
          steps: nextSteps,
        },
      } as PsycheGoal),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);
  }

  function openGoal(goal: PsycheGoal) {
    setSelectedGoalId(goal.id);
  }

  const canNavigate = !!navigation?.navigate;

  if (!selectedGoal) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>Fortschritt</Text>
            <Text style={styles.title}>Ziele, Steps und Fortschritt. Ohne Spielerei.</Text>
            <Text style={styles.subtitle}>
              Direkt hier Ziele anlegen, kleine Steps farblich kategorisieren und sauber abhaken.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Neues Ziel anlegen</Text>

            <Text style={styles.label}>Zieltitel</Text>
            <TextInput
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              placeholder="z. B. 2000 Elo erreichen / 8 kg abnehmen / Mondscheinsonate lernen"
              placeholderTextColor="rgba(255,248,238,0.35)"
              style={styles.input}
            />

            <Text style={styles.label}>Zielkategorie</Text>
            <View style={styles.chipWrap}>
              {GOAL_CATEGORIES.map((item) => {
                const active = newGoalCategory === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setNewGoalCategory(item.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? item.bg : 'rgba(255,248,238,0.06)',
                        borderColor: active ? `${item.color}88` : BORDER,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: active ? item.color : TEXT },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Zieldatum</Text>
            <TextInput
              value={newGoalTargetDate}
              onChangeText={setNewGoalTargetDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,248,238,0.35)"
              style={styles.input}
            />

            <Pressable onPress={handleCreateGoal} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Ziel erstellen</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alle Ziele</Text>

            {!goals.length ? (
              <Text style={styles.emptyText}>
                Noch keine Ziele vorhanden. Lege oben dein erstes Ziel an.
              </Text>
            ) : (
              goals.map((goal) => (
                <View key={goal.id}>
                  <GoalCard goal={goal} onOpen={() => openGoal(goal)} />
                  <View style={styles.goalActionRow}>
                    <Pressable onPress={() => openGoal(goal)} style={styles.secondaryBtn}>
                      <Text style={styles.secondaryBtnText}>Öffnen</Text>
                    </Pressable>

                    {canNavigate ? (
                      <Pressable
                        onPress={() => navigation?.navigate?.('GoalDetail', { goalId: goal.id })}
                        style={styles.secondaryBtn}
                      >
                        <Text style={styles.secondaryBtnText}>Detail</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => handleDeleteGoal(goal.id)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteBtnText}>Löschen</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const progress = computeGoalProgress(selectedGoal);
  const manualSteps = getManualSteps(selectedGoal);
  const aiSteps = getAiSteps(selectedGoal);
  const goalMeta = getGoalCategoryMeta(String(selectedGoal.category));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => setSelectedGoalId(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Zur Übersicht</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroTopMeta}>
            <View
              style={[
                styles.goalTypeBadge,
                {
                  backgroundColor: goalMeta.bg,
                  borderColor: `${goalMeta.color}55`,
                },
              ]}
            >
              <Text style={[styles.goalTypeBadgeText, { color: goalMeta.color }]}>
                {goalMeta.label}
              </Text>
            </View>
            <Text style={styles.heroPercent}>{progress}%</Text>
          </View>

          <Text style={styles.title}>{selectedGoal.title}</Text>
          <Text style={styles.subtitle}>
            Ziel bis {dayjs(selectedGoal.targetDate).format('DD.MM.YYYY')} · {manualSteps.length}{' '}
            eigene Steps · {aiSteps.length} KI-Phasen
          </Text>

          <GoalProgressBar value={progress} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eigenen Step hinzufügen</Text>

          <Text style={styles.label}>Step</Text>
          <TextInput
            value={newStepTitle}
            onChangeText={setNewStepTitle}
            placeholder="z. B. 20 kritische Schachstellungen analysieren"
            placeholderTextColor="rgba(255,248,238,0.35)"
            style={styles.input}
          />

          <Text style={styles.label}>Kurze Notiz</Text>
          <TextInput
            value={newStepNote}
            onChangeText={setNewStepNote}
            placeholder="z. B. mit Kandidatenzug-Protokoll"
            placeholderTextColor="rgba(255,248,238,0.35)"
            style={styles.input}
          />

          <Text style={styles.label}>Kategorie</Text>
          <View style={styles.chipWrap}>
            {STEP_CATEGORIES.map((item) => {
              const active = newStepCategory === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setNewStepCategory(item.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? item.bg : 'rgba(255,248,238,0.06)',
                      borderColor: active ? `${item.color}88` : BORDER,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? item.color : TEXT },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleAddManualStep} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Step hinzufügen</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eigene kleine Steps</Text>

          {!manualSteps.length ? (
            <Text style={styles.emptyText}>
              Noch keine eigenen Steps. Lege oben deine ersten kleinen Schritte an.
            </Text>
          ) : (
            manualSteps.map((step) => (
              <ManualStepRow
                key={step.id}
                step={step}
                onToggle={() => handleToggleManualStep(step.id)}
                onDelete={() => handleDeleteManualStep(step.id)}
              />
            ))
          )}
        </View>

        {!!aiSteps.length && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>KI-Plan</Text>
            <Text style={styles.smallMuted}>
              Der KI-Plan bleibt als strukturierte Liste erhalten. Kein Grafikpfad mehr.
            </Text>

            {aiSteps.map((step, index) => (
              <View
                key={step.id}
                style={[styles.aiStepCard, isAiStepComplete(step) && styles.aiStepCardDone]}
              >
                <View style={styles.aiStepTop}>
                  <Text style={styles.aiStepIndex}>
                    PHASE {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.aiStepState}>
                    {isAiStepComplete(step) ? 'Erledigt' : 'Aktiv'}
                  </Text>
                </View>

                <Text style={styles.aiStepTitle}>{step.title}</Text>
                <Text style={styles.aiStepText}>{step.explanation}</Text>

                <View style={styles.aiChecklistWrap}>
                  {(step.checklist ?? []).map((item) => (
                    <AiChecklistRow
                      key={item.id}
                      item={item}
                      onToggle={() => handleToggleAiChecklist(step.id, item.id)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
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
    padding: 18,
    paddingBottom: 120,
    gap: 16,
  },
  hero: {
    backgroundColor: BG_SOFT,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPercent: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '900',
  },
  kicker: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,248,238,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontWeight: '800',
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: GOLD,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#1A120D',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,248,238,0.08)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 14,
  },
  deleteBtn: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,143,143,0.14)',
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: RED,
    fontWeight: '800',
    fontSize: 14,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  smallMuted: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  goalCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: CARD_LIGHT,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTinyMeta: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
  },
  goalTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  goalTypeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  goalTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 8,
  },
  goalMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  goalPercent: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '900',
  },
  goalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,248,238,0.12)',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: GREEN,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,248,238,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backBtnText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  stepRowWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  stepAccent: {
    width: 6,
    borderRadius: 999,
  },
  stepRow: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: CARD_DARK,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepRowDone: {
    backgroundColor: 'rgba(126,219,122,0.10)',
    borderColor: 'rgba(126,219,122,0.18)',
  },
  stepMain: {
    flex: 1,
  },
  stepTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCategoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  stepCategoryText: {
    fontSize: 11,
    fontWeight: '900',
  },
  stepStateText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
  },
  stepTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  stepTitleDone: {
    color: GREEN,
  },
  stepNote: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  stepNoteDone: {
    color: 'rgba(126,219,122,0.82)',
  },
  deleteMiniBtn: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,143,143,0.14)',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteMiniBtnText: {
    color: RED,
    fontWeight: '800',
    fontSize: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,248,238,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkMark: {
    color: '#183117',
    fontWeight: '900',
  },
  aiStepCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: CARD_DARK,
    borderWidth: 1,
    borderColor: BORDER,
  },
  aiStepCardDone: {
    borderColor: 'rgba(126,219,122,0.20)',
    backgroundColor: 'rgba(126,219,122,0.08)',
  },
  aiStepTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiStepIndex: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
  },
  aiStepState: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  aiStepTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  aiStepText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  aiChecklistWrap: {
    gap: 10,
    marginTop: 14,
  },
  aiCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,248,238,0.06)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  aiCheckRowDone: {
    backgroundColor: 'rgba(126,219,122,0.12)',
    borderColor: 'rgba(126,219,122,0.20)',
  },
  aiCheckText: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  aiCheckTextDone: {
    color: GREEN,
    fontWeight: '800',
  },
});