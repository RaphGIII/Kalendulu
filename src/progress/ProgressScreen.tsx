import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GoalExecutionPlan,
  GoalMiniStep,
  GoalMiniStepStatus,
  PlannerExecutionChecklistItem,
  PlannerExecutionStep,
  PsycheGoal,
} from '../psyche/types';
import { loadPsycheGoals, savePsycheGoals } from '../psyche/storage';

dayjs.locale('de');

const BG = '#2E437A';
const SURFACE = '#132C5F';
const SURFACE_SOFT = '#183D8A';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';
const ACCENT = '#D4AF37';
const ACCENT_SOFT = 'rgba(212,175,55,0.18)';
const DANGER = '#FF8F8F';

const HORIZONS_STORAGE_KEY = 'progress_custom_horizons_v1';
const CATEGORIES_STORAGE_KEY = 'progress_custom_goal_categories_v1';

type Props = {
  navigation?: {
    navigate?: (screen: string, params?: Record<string, unknown>) => void;
  };
};

type ManualStep = GoalMiniStep & {
  note?: string;
  source?: 'manual';
};

type CustomHorizon = {
  id: string;
  title: string;
  yearsFrom?: number;
  monthsFrom?: number;
  order: number;
};

type CustomGoalCategory = {
  id: string;
  title: string;
  order: number;
};

type AppGoal = PsycheGoal & {
  manualSteps?: ManualStep[];
  customCategoryLabel?: string;
  source?: string;
  progress?: {
    total?: number;
    [key: string]: unknown;
  };
  executionPlan?: GoalExecutionPlan;
};

const DEFAULT_HORIZONS: CustomHorizon[] = [
  { id: 'life', title: 'Lebensziele', yearsFrom: 20, order: 1 },
  { id: 'tenYears', title: '10 Jahres Ziele', yearsFrom: 10, order: 2 },
  { id: 'fiveYears', title: '5 Jahres Ziele', yearsFrom: 5, order: 3 },
  { id: 'oneYear', title: '1 Jahres Ziele', yearsFrom: 1, order: 4 },
  { id: 'short', title: 'Kurzfristige Ziele', monthsFrom: 3, order: 5 },
];

const DEFAULT_GOAL_CATEGORIES: CustomGoalCategory[] = [
  { id: 'fitness', title: 'Fitness', order: 1 },
  { id: 'study', title: 'Lernen', order: 2 },
  { id: 'business', title: 'Business', order: 3 },
  { id: 'music', title: 'Musik', order: 4 },
  { id: 'project', title: 'Projekt', order: 5 },
  { id: 'other', title: 'Andere', order: 6 },
];

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toMiniStepStatus(done: boolean): GoalMiniStepStatus {
  return done ? 'done' : 'active';
}

function buildMiniStepsFromManual(steps: ManualStep[]): GoalMiniStep[] {
  return steps.map((step, index) => ({
    id: step.id,
    order: index + 1,
    title: step.title,
    description: step.description ?? step.title,
    done: !!step.done,
    status: toMiniStepStatus(!!step.done),
    linkedTodoTitles: step.linkedTodoTitles ?? [],
    linkedHabitTitles: step.linkedHabitTitles ?? [],
  }));
}

function getManualSteps(goal: AppGoal): ManualStep[] {
  return Array.isArray(goal.manualSteps) ? goal.manualSteps : [];
}

function getAiSteps(goal: AppGoal): PlannerExecutionStep[] {
  return Array.isArray(goal.executionPlan?.steps) ? goal.executionPlan.steps : [];
}

function computeGoalProgress(goal: AppGoal) {
  const manualSteps = getManualSteps(goal);
  const aiSteps = getAiSteps(goal);

  const manualTotal = manualSteps.length;
  const manualDone = manualSteps.filter((step) => !!step.done).length;

  const aiChecklist = aiSteps.flatMap((step) => step.checklist ?? []);
  const aiTotal = aiChecklist.length;
  const aiDone = aiChecklist.filter((item) => !!item.done).length;

  const total = manualTotal + aiTotal;

  if (total > 0) {
    return Math.round(((manualDone + aiDone) / total) * 100);
  }

  if (typeof goal.progressPercent === 'number') {
    return Math.max(0, Math.min(100, goal.progressPercent));
  }

  if (goal.progress && typeof goal.progress.total === 'number') {
    return Math.max(0, Math.min(100, goal.progress.total));
  }

  return 0;
}

function getHorizonThresholdMonths(horizon: CustomHorizon) {
  if (typeof horizon.yearsFrom === 'number') return horizon.yearsFrom * 12;
  if (typeof horizon.monthsFrom === 'number') return horizon.monthsFrom;
  return 0;
}

function inferGoalHorizon(goal: AppGoal, customHorizons: CustomHorizon[]): string {
  if (!customHorizons.length) return 'life';
  if (!goal.targetDate) return customHorizons[0]?.id ?? 'life';

  const now = dayjs();
  const target = dayjs(goal.targetDate);

  if (!target.isValid()) return customHorizons[0]?.id ?? 'life';

  const monthsUntil = target.diff(now, 'month', true);

  const sortedByThresholdDesc = [...customHorizons].sort(
    (a, b) => getHorizonThresholdMonths(b) - getHorizonThresholdMonths(a),
  );

  for (const horizon of sortedByThresholdDesc) {
    const threshold = getHorizonThresholdMonths(horizon);
    if (monthsUntil >= threshold) {
      return horizon.id;
    }
  }

  const lastByOrder = [...customHorizons].sort((a, b) => a.order - b.order).slice(-1)[0];
  return lastByOrder?.id ?? 'short';
}

function prettyGoalCategory(goal: AppGoal, categories: CustomGoalCategory[]) {
  if (goal.customCategoryLabel?.trim()) return goal.customCategoryLabel.trim();
  const found = categories.find((item) => item.id === goal.category);
  return found?.title ?? 'Andere';
}

function getHorizonColor(horizonId: string, customHorizons: CustomHorizon[]) {
  const ordered = [...customHorizons].sort((a, b) => a.order - b.order);
  const palette = ['#7EDB7A', '#6AD2FF', '#C6A2FF', '#FFB870', '#D4AF37', '#FF9CC7', '#9BE7D8'];

  const index = ordered.findIndex((item) => item.id === horizonId);
  if (index === -1) return '#D4AF37';

  return palette[index % palette.length];
}

function GoalRow({
  goal,
  horizons,
  onPress,
}: {
  goal: AppGoal;
  horizons: CustomHorizon[];
  onPress: () => void;
}) {
  const progress = computeGoalProgress(goal);
  const horizonColor = getHorizonColor(inferGoalHorizon(goal, horizons), horizons);

  return (
    <Pressable onPress={onPress} style={styles.goalRow}>
      <View style={[styles.goalRowBar, { backgroundColor: horizonColor }]} />
      <Text numberOfLines={1} style={styles.goalRowTitle}>
        {goal.title}
      </Text>
      <Text style={styles.goalRowPercent}>{progress}%</Text>
    </Pressable>
  );
}

function StepRow({
  title,
  description,
  done,
  onToggle,
}: {
  title: string;
  description?: string;
  done?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.stepRow}>
      <View style={[styles.check, done && styles.checkDone]}>
        {done ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>

      <View style={styles.stepTextWrap}>
        <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{title}</Text>
        {!!description && description !== title ? (
          <Text style={styles.stepDescription}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ProgressScreen({ navigation }: Props) {
  const [goals, setGoals] = useState<AppGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageMetaOpen, setManageMetaOpen] = useState(false);

  const [horizons, setHorizons] = useState<CustomHorizon[]>(DEFAULT_HORIZONS);
  const [goalCategories, setGoalCategories] = useState<CustomGoalCategory[]>(DEFAULT_GOAL_CATEGORIES);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<string>('other');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState(dayjs().add(1, 'year').format('YYYY-MM-DD'));
  const [newGoalHorizon, setNewGoalHorizon] = useState<string>('oneYear');

  const [newHorizonTitle, setNewHorizonTitle] = useState('');
  const [newHorizonYears, setNewHorizonYears] = useState('');
  const [newHorizonMonths, setNewHorizonMonths] = useState('');

  const [newCategoryTitle, setNewCategoryTitle] = useState('');

  const [editingHorizonId, setEditingHorizonId] = useState<string | null>(null);
  const [editingHorizonTitle, setEditingHorizonTitle] = useState('');

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState('');

  const [draftSteps, setDraftSteps] = useState<ManualStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');

  const reloadGoals = useCallback(async () => {
    const storedGoals = (await loadPsycheGoals()) as AppGoal[];
    const normalized = storedGoals.map((goal) => ({
      ...goal,
      progressPercent: computeGoalProgress(goal),
    }));
    setGoals(normalized);
    setSelectedGoalId((prev) => (prev && normalized.some((g) => g.id === prev) ? prev : null));
  }, []);

  async function loadCustomMeta() {
    try {
      const horizonsRaw = await AsyncStorage.getItem(HORIZONS_STORAGE_KEY);
      const categoriesRaw = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);

      if (horizonsRaw) {
        const parsed = JSON.parse(horizonsRaw) as CustomHorizon[];
        if (Array.isArray(parsed) && parsed.length) {
          setHorizons(parsed.sort((a, b) => a.order - b.order));
        }
      }

      if (categoriesRaw) {
        const parsed = JSON.parse(categoriesRaw) as CustomGoalCategory[];
        if (Array.isArray(parsed) && parsed.length) {
          setGoalCategories(parsed.sort((a, b) => a.order - b.order));
        }
      }
    } catch (error) {
      console.log('Meta laden fehlgeschlagen', error);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void reloadGoals();
      void loadCustomMeta();
    }, [reloadGoals]),
  );

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const groupedGoals = useMemo(() => {
    const groups: Record<string, AppGoal[]> = {};

    horizons.forEach((horizon) => {
      groups[horizon.id] = [];
    });

    for (const goal of goals) {
      const horizonId = inferGoalHorizon(goal, horizons);
      if (!groups[horizonId]) groups[horizonId] = [];
      groups[horizonId].push(goal);
    }

    return groups;
  }, [goals, horizons]);

  const visibleSteps = useMemo(() => {
    if (!selectedGoal) return [];

    const manualSteps = getManualSteps(selectedGoal);
    if (manualSteps.length) {
      return manualSteps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description || step.note || '',
        done: !!step.done,
        type: 'manual' as const,
      }));
    }

    const aiSteps = getAiSteps(selectedGoal);
    return aiSteps.flatMap((step) =>
      (step.checklist ?? []).map((item) => ({
        id: `${step.id}_${item.id}`,
        stepId: step.id,
        itemId: item.id,
        title: item.label,
        description: step.explanation || '',
        done: !!item.done,
        type: 'ai' as const,
      })),
    );
  }, [selectedGoal]);

  async function persistGoals(nextGoals: AppGoal[]) {
    setGoals(nextGoals);
    await savePsycheGoals(nextGoals as PsycheGoal[]);
  }

  async function persistHorizons(nextHorizons: CustomHorizon[]) {
    const normalized = nextHorizons
      .map((item, index) => ({ ...item, order: index + 1 }))
      .sort((a, b) => a.order - b.order);

    setHorizons(normalized);
    await AsyncStorage.setItem(HORIZONS_STORAGE_KEY, JSON.stringify(normalized));
  }

  async function persistGoalCategories(nextCategories: CustomGoalCategory[]) {
    const normalized = nextCategories
      .map((item, index) => ({ ...item, order: index + 1 }))
      .sort((a, b) => a.order - b.order);

    setGoalCategories(normalized);
    await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(normalized));
  }

  async function handleRenameHorizon() {
    const trimmed = editingHorizonTitle.trim();
    if (!editingHorizonId || !trimmed) return;

    const next = horizons.map((item) =>
      item.id === editingHorizonId ? { ...item, title: trimmed } : item,
    );

    await persistHorizons(next);
    setEditingHorizonId(null);
    setEditingHorizonTitle('');
  }

  async function handleDeleteHorizon(id: string) {
    if (horizons.length <= 1) return;

    Alert.alert('Zeitraum löschen', 'Diesen Zeitraum wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const nextHorizons = horizons.filter((item) => item.id !== id);
          await persistHorizons(nextHorizons);
        },
      },
    ]);
  }

  async function handleRenameCategory() {
    const trimmed = editingCategoryTitle.trim();
    if (!editingCategoryId || !trimmed) return;

    const next = goalCategories.map((item) =>
      item.id === editingCategoryId ? { ...item, title: trimmed } : item,
    );

    await persistGoalCategories(next);
    setEditingCategoryId(null);
    setEditingCategoryTitle('');
  }

  async function handleDeleteCategory(id: string) {
    if (goalCategories.length <= 1) return;

    Alert.alert('Kategorie löschen', 'Diese Kategorie wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const nextCategories = goalCategories.filter((item) => item.id !== id);
          await persistGoalCategories(nextCategories);
        },
      },
    ]);
  }

  function targetDateFromHorizon(horizonId: string) {
    const horizon = horizons.find((item) => item.id === horizonId);

    if (!horizon) {
      return dayjs().add(1, 'year').format('YYYY-MM-DD');
    }

    if (typeof horizon.yearsFrom === 'number') {
      return dayjs().add(horizon.yearsFrom, 'year').format('YYYY-MM-DD');
    }

    if (typeof horizon.monthsFrom === 'number') {
      return dayjs().add(horizon.monthsFrom, 'month').format('YYYY-MM-DD');
    }

    return dayjs().add(1, 'year').format('YYYY-MM-DD');
  }

  function openCreate(horizonId: string) {
    setNewGoalHorizon(horizonId);
    setNewGoalTargetDate(targetDateFromHorizon(horizonId));
    setCreateOpen(true);
  }

  function openEditSteps() {
    if (!selectedGoal) return;
    setDraftSteps(getManualSteps(selectedGoal));
    setNewStepTitle('');
    setNewStepDescription('');
    setEditOpen(true);
  }

  async function handleCreateGoal() {
    const trimmed = newGoalTitle.trim();
    if (!trimmed) return;

    const targetDateIso = dayjs(newGoalTargetDate, 'YYYY-MM-DD', true).isValid()
      ? dayjs(newGoalTargetDate).endOf('day').toISOString()
      : dayjs(targetDateFromHorizon(newGoalHorizon)).endOf('day').toISOString();

    const now = new Date().toISOString();

    const newGoal: AppGoal = {
      id: uid('goal'),
      title: trimmed,
      category: newGoalCategory,
      difficultyLevel: 1,
      targetDate: targetDateIso,
      createdAt: now,
      why: '',
      answers: {},
      recommendation: {
        summary: 'Manuell im Fortschritt-Tab erstellt.',
        todayFocus: '',
        nextStep: '',
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

    setCreateOpen(false);
    setNewGoalTitle('');
    setNewGoalCategory('other');
    setNewGoalTargetDate(dayjs().add(1, 'year').format('YYYY-MM-DD'));
    setSelectedGoalId(newGoal.id);
  }

  async function handleToggleManualStep(stepId: string) {
    if (!selectedGoal) return;

    const nextManualSteps: ManualStep[] = getManualSteps(selectedGoal).map((step) =>
      step.id === stepId
        ? {
            ...step,
            done: !step.done,
            status: toMiniStepStatus(!step.done),
          }
        : step,
    );

    const nextGoal: AppGoal = {
      ...selectedGoal,
      manualSteps: nextManualSteps,
      miniSteps: buildMiniStepsFromManual(nextManualSteps),
      progressPercent: computeGoalProgress({
        ...selectedGoal,
        manualSteps: nextManualSteps,
      }),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);
  }

  async function handleToggleAiChecklist(stepId: string, itemId: string) {
    if (!selectedGoal || !selectedGoal.executionPlan) return;

    const nextSteps: PlannerExecutionStep[] = getAiSteps(selectedGoal).map((step) => {
      if (step.id !== stepId) return step;

      return {
        ...step,
        checklist: (step.checklist ?? []).map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item,
        ),
      };
    });

    const nextGoal: AppGoal = {
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
      }),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);
  }

  function handleDraftStepChange(id: string, field: 'title' | 'description', value: string) {
    setDraftSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, [field]: value } : step)),
    );
  }

  function handleMoveDraftStep(index: number, direction: -1 | 1) {
    setDraftSteps((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const cloned = [...prev];
      const temp = cloned[index];
      cloned[index] = cloned[nextIndex];
      cloned[nextIndex] = temp;

      return cloned.map((step, idx) => ({
        ...step,
        order: idx + 1,
      }));
    });
  }

  function handleDeleteDraftStep(id: string) {
    setDraftSteps((prev) =>
      prev
        .filter((step) => step.id !== id)
        .map((step, idx) => ({
          ...step,
          order: idx + 1,
        })),
    );
  }

  function handleAddDraftStep() {
    const trimmed = newStepTitle.trim();
    if (!trimmed) return;

    const newStep: ManualStep = {
      id: uid('manual_step'),
      order: draftSteps.length + 1,
      title: trimmed,
      description: newStepDescription.trim() || trimmed,
      done: false,
      status: 'active',
      source: 'manual',
      linkedTodoTitles: [],
      linkedHabitTitles: [],
    };

    setDraftSteps((prev) => [...prev, newStep]);
    setNewStepTitle('');
    setNewStepDescription('');
  }

  async function handleSaveDraftSteps() {
    if (!selectedGoal) return;

    const normalized = draftSteps.map((step, index) => ({
      ...step,
      order: index + 1,
      status: toMiniStepStatus(!!step.done),
    }));

    const nextGoal: AppGoal = {
      ...selectedGoal,
      manualSteps: normalized,
      miniSteps: buildMiniStepsFromManual(normalized),
      progressPercent: computeGoalProgress({
        ...selectedGoal,
        manualSteps: normalized,
      }),
    };

    const nextGoals = goals.map((goal) => (goal.id === selectedGoal.id ? nextGoal : goal));
    await persistGoals(nextGoals);
    setEditOpen(false);
  }

  async function handleDeleteGoal() {
    if (!selectedGoal) return;

    Alert.alert('Ziel löschen', 'Möchtest du dieses Ziel wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          const nextGoals = goals.filter((goal) => goal.id !== selectedGoal.id);
          await persistGoals(nextGoals);
          setSelectedGoalId(null);
        },
      },
    ]);
  }

  if (!selectedGoal) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageTitleCard}>
            <Text style={styles.pageTitle}>Fortschritt</Text>
            <Text style={styles.pageSubtitle}>Deine Ziele an einem Ort</Text>

            <Pressable style={styles.manageMetaBtn} onPress={() => setManageMetaOpen(true)}>
              <Text style={styles.manageMetaBtnText}>Zeiträume & Kategorien bearbeiten</Text>
            </Pressable>
          </View>

          {[...horizons]
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const items = groupedGoals[section.id] ?? [];

              return (
                <View key={section.id} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{section.title}</Text>
                    <Pressable onPress={() => openCreate(section.id)} style={styles.groupPlus}>
                      <Text style={styles.groupPlusText}>+</Text>
                    </Pressable>
                  </View>

                  <View style={styles.groupList}>
                    {items.length ? (
                      items.map((goal) => (
                        <GoalRow
                          key={goal.id}
                          goal={goal}
                          horizons={horizons}
                          onPress={() => setSelectedGoalId(goal.id)}
                        />
                      ))
                    ) : (
                      <Text style={styles.emptyText}>Kein Ziel</Text>
                    )}
                  </View>
                </View>
              );
            })}
        </ScrollView>

        <Pressable style={styles.fab} onPress={() => openCreate('oneYear')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>

        <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Neues Ziel</Text>

              <Text style={styles.label}>Titel</Text>
              <TextInput
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
                placeholder="Ziel eingeben"
                placeholderTextColor={MUTED}
                style={styles.input}
              />

              <Text style={styles.label}>Datum</Text>
              <TextInput
                value={newGoalTargetDate}
                onChangeText={setNewGoalTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={MUTED}
                style={styles.input}
              />

              <Text style={styles.label}>Zeitraum</Text>
              <View style={styles.pillRow}>
                {[...horizons]
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const active = newGoalHorizon === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setNewGoalHorizon(item.id);
                          setNewGoalTargetDate(targetDateFromHorizon(item.id));
                        }}
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>{item.title}</Text>
                      </Pressable>
                    );
                  })}
              </View>

              <Text style={styles.label}>Kategorie</Text>
              <View style={styles.pillRow}>
                {[...goalCategories]
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const active = newGoalCategory === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setNewGoalCategory(item.id)}
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>{item.title}</Text>
                      </Pressable>
                    );
                  })}
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryBtn} onPress={() => setCreateOpen(false)}>
                  <Text style={styles.secondaryBtnText}>Abbrechen</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={handleCreateGoal}>
                  <Text style={styles.primaryBtnText}>Erstellen</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={manageMetaOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setManageMetaOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Zeiträume & Kategorien</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editList}>
                <Text style={styles.label}>Zeiträume</Text>

                {[...horizons]
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                    <View key={item.id} style={styles.editCard}>
                      {editingHorizonId === item.id ? (
                        <>
                          <TextInput
                            value={editingHorizonTitle}
                            onChangeText={setEditingHorizonTitle}
                            placeholder="Zeitraum"
                            placeholderTextColor={MUTED}
                            style={styles.input}
                          />

                          <View style={styles.editActionsRow}>
                            <Pressable style={styles.smallBtn} onPress={handleRenameHorizon}>
                              <Text style={styles.smallBtnText}>✓</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                setEditingHorizonId(null);
                                setEditingHorizonTitle('');
                              }}
                            >
                              <Text style={styles.smallBtnText}>✕</Text>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.inputStaticText}>{item.title}</Text>
                          <Text style={styles.inputStaticSubtext}>
                            {typeof item.yearsFrom === 'number'
                              ? `${item.yearsFrom} Jahre`
                              : `${item.monthsFrom ?? 0} Monate`}
                          </Text>

                          <View style={styles.editActionsRow}>
                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                setEditingHorizonId(item.id);
                                setEditingHorizonTitle(item.title);
                              }}
                            >
                              <Text style={styles.smallBtnText}>✎</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                if (index === 0) return;
                                const ordered = [...horizons].sort((a, b) => a.order - b.order);
                                [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
                                void persistHorizons(ordered);
                              }}
                            >
                              <Text style={styles.smallBtnText}>↑</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                const ordered = [...horizons].sort((a, b) => a.order - b.order);
                                if (index === ordered.length - 1) return;
                                [ordered[index + 1], ordered[index]] = [ordered[index], ordered[index + 1]];
                                void persistHorizons(ordered);
                              }}
                            >
                              <Text style={styles.smallBtnText}>↓</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtnDanger}
                              onPress={() => handleDeleteHorizon(item.id)}
                            >
                              <Text style={styles.smallBtnDangerText}>Löschen</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  ))}

                <View style={styles.addCard}>
                  <Text style={styles.label}>Neuen Zeitraum anlegen</Text>

                  <TextInput
                    value={newHorizonTitle}
                    onChangeText={setNewHorizonTitle}
                    placeholder="z. B. 3 Jahres Ziele"
                    placeholderTextColor={MUTED}
                    style={styles.input}
                  />

                  <TextInput
                    value={newHorizonYears}
                    onChangeText={setNewHorizonYears}
                    placeholder="Jahre optional"
                    placeholderTextColor={MUTED}
                    style={styles.input}
                    keyboardType="numeric"
                  />

                  <TextInput
                    value={newHorizonMonths}
                    onChangeText={setNewHorizonMonths}
                    placeholder="Monate optional"
                    placeholderTextColor={MUTED}
                    style={styles.input}
                    keyboardType="numeric"
                  />

                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={async () => {
                      const trimmed = newHorizonTitle.trim();
                      if (!trimmed) return;

                      const years = newHorizonYears.trim() ? Number(newHorizonYears) : undefined;
                      const months = newHorizonMonths.trim() ? Number(newHorizonMonths) : undefined;

                      const newItem: CustomHorizon = {
                        id: uid('horizon'),
                        title: trimmed,
                        yearsFrom: Number.isFinite(years as number) ? years : undefined,
                        monthsFrom: Number.isFinite(months as number) ? months : undefined,
                        order: horizons.length + 1,
                      };

                      await persistHorizons([...horizons, newItem]);
                      setNewHorizonTitle('');
                      setNewHorizonYears('');
                      setNewHorizonMonths('');
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>Zeitraum hinzufügen</Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { marginTop: 18 }]}>Kategorien</Text>

                {[...goalCategories]
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                    <View key={item.id} style={styles.editCard}>
                      {editingCategoryId === item.id ? (
                        <>
                          <TextInput
                            value={editingCategoryTitle}
                            onChangeText={setEditingCategoryTitle}
                            placeholder="Kategorie"
                            placeholderTextColor={MUTED}
                            style={styles.input}
                          />

                          <View style={styles.editActionsRow}>
                            <Pressable style={styles.smallBtn} onPress={handleRenameCategory}>
                              <Text style={styles.smallBtnText}>✓</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryTitle('');
                              }}
                            >
                              <Text style={styles.smallBtnText}>✕</Text>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.inputStaticText}>{item.title}</Text>

                          <View style={styles.editActionsRow}>
                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                setEditingCategoryId(item.id);
                                setEditingCategoryTitle(item.title);
                              }}
                            >
                              <Text style={styles.smallBtnText}>✎</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                if (index === 0) return;
                                const ordered = [...goalCategories].sort((a, b) => a.order - b.order);
                                [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
                                void persistGoalCategories(ordered);
                              }}
                            >
                              <Text style={styles.smallBtnText}>↑</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtn}
                              onPress={() => {
                                const ordered = [...goalCategories].sort((a, b) => a.order - b.order);
                                if (index === ordered.length - 1) return;
                                [ordered[index + 1], ordered[index]] = [ordered[index], ordered[index + 1]];
                                void persistGoalCategories(ordered);
                              }}
                            >
                              <Text style={styles.smallBtnText}>↓</Text>
                            </Pressable>

                            <Pressable
                              style={styles.smallBtnDanger}
                              onPress={() => handleDeleteCategory(item.id)}
                            >
                              <Text style={styles.smallBtnDangerText}>Löschen</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  ))}

                <View style={styles.addCard}>
                  <Text style={styles.label}>Neue Kategorie anlegen</Text>

                  <TextInput
                    value={newCategoryTitle}
                    onChangeText={setNewCategoryTitle}
                    placeholder="z. B. Finanzen"
                    placeholderTextColor={MUTED}
                    style={styles.input}
                  />

                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={async () => {
                      const trimmed = newCategoryTitle.trim();
                      if (!trimmed) return;

                      const newItem: CustomGoalCategory = {
                        id: uid('category'),
                        title: trimmed,
                        order: goalCategories.length + 1,
                      };

                      await persistGoalCategories([...goalCategories, newItem]);
                      setNewCategoryTitle('');
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>Kategorie hinzufügen</Text>
                  </Pressable>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.primaryBtn} onPress={() => setManageMetaOpen(false)}>
                  <Text style={styles.primaryBtnText}>Fertig</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setSelectedGoalId(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Fortschritt</Text>
        </Pressable>

        <Text style={styles.detailTitle}>Step by Step</Text>

<View style={styles.stepsWrap}>
          {visibleSteps.length ? (
            visibleSteps.map((step) => (
              <StepRow
                key={step.id}
                title={step.title}
                description={step.description}
                done={step.done}
                onToggle={() => {
                  if (step.type === 'manual') {
                    void handleToggleManualStep(step.id);
                  } else {
                    void handleToggleAiChecklist(step.stepId, step.itemId);
                  }
                }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Noch keine Steps vorhanden.</Text>
          )}
        </View>

        <Pressable style={styles.deleteGoalBtn} onPress={handleDeleteGoal}>
          <Text style={styles.deleteGoalBtnText}>Ziel löschen</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={styles.editFab} onPress={openEditSteps}>
        <Text style={styles.editFabText}>Bearbeiten</Text>
      </Pressable>

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Steps bearbeiten</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editList}>
              {draftSteps.map((step, index) => (
                <View key={step.id} style={styles.editCard}>
                  <Text style={styles.label}>Step</Text>
                  <TextInput
                    value={step.title}
                    onChangeText={(value) => handleDraftStepChange(step.id, 'title', value)}
                    placeholder="Step"
                    placeholderTextColor={MUTED}
                    style={styles.input}
                  />

                  <Text style={styles.label}>Beschreibung</Text>
                  <TextInput
                    value={step.description ?? ''}
                    onChangeText={(value) => handleDraftStepChange(step.id, 'description', value)}
                    placeholder="Beschreibung"
                    placeholderTextColor={MUTED}
                    style={[styles.input, styles.textarea]}
                    multiline
                  />

                  <View style={styles.editActionsRow}>
                    <Pressable style={styles.smallBtn} onPress={() => handleMoveDraftStep(index, -1)}>
                      <Text style={styles.smallBtnText}>↑</Text>
                    </Pressable>

                    <Pressable style={styles.smallBtn} onPress={() => handleMoveDraftStep(index, 1)}>
                      <Text style={styles.smallBtnText}>↓</Text>
                    </Pressable>

                    <Pressable style={styles.smallBtnDanger} onPress={() => handleDeleteDraftStep(step.id)}>
                      <Text style={styles.smallBtnDangerText}>Löschen</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.addCard}>
                <Text style={styles.label}>Neuer Step</Text>
                <TextInput
                  value={newStepTitle}
                  onChangeText={setNewStepTitle}
                  placeholder="Titel"
                  placeholderTextColor={MUTED}
                  style={styles.input}
                />

                <Text style={styles.label}>Beschreibung</Text>
                <TextInput
                  value={newStepDescription}
                  onChangeText={setNewStepDescription}
                  placeholder="Beschreibung"
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.textarea]}
                  multiline
                />

                <Pressable style={styles.secondaryBtn} onPress={handleAddDraftStep}>
                  <Text style={styles.secondaryBtnText}>Step hinzufügen</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setEditOpen(false)}>
                <Text style={styles.secondaryBtnText}>Abbrechen</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={handleSaveDraftSteps}>
                <Text style={styles.primaryBtnText}>Speichern</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },

  pageTitle: {
    color: TEXT,
    fontSize: 30,
    fontWeight: '800',
  },

  group: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  groupTitle: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
  },
  groupPlus: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_SOFT,
  },
  groupPlusText: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '600',
    marginTop: -1,
  },

  groupList: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  goalRowBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 999,
    marginRight: 12,
  },
  goalRow: {
    minHeight: 56,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  goalRowTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    fontWeight: '500',
    paddingRight: 12,
  },
  goalRowPercent: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '700',
  },

  emptyText: {
    color: MUTED,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backBtnText: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '600',
  },

  stepsWrap: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: ACCENT,
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  checkDone: {
    backgroundColor: ACCENT_SOFT,
  },
  checkMark: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '800',
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
  },
  stepTitleDone: {
    opacity: 0.7,
  },
  stepDescription: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 33,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '500',
    marginTop: -2,
  },

  editFab: {
    position: 'absolute',
    right: 20,
    bottom: 64,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 999,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  editFabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  deleteGoalBtn: {
    marginTop: 18,
    alignSelf: 'flex-start',
  },
  deleteGoalBtnText: {
    color: DANGER,
    fontSize: 14,
    fontWeight: '600',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,10,24,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: SURFACE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  sheetTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
  },

  label: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: SURFACE_SOFT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  textarea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: {
    backgroundColor: ACCENT_SOFT,
    borderColor: '#C8D7FF',
  },
  pillText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '500',
  },
  pillTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: SURFACE_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
  },

  editList: {
    paddingBottom: 12,
  },
  editCard: {
    backgroundColor: SURFACE_SOFT,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    minWidth: 44,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  smallBtnDanger: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,143,143,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,143,143,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnDangerText: {
    color: DANGER,
    fontSize: 14,
    fontWeight: '700',
  },
  addCard: {
    backgroundColor: SURFACE_SOFT,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
  },

  pageTitleCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 18,
  },
  pageSubtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: '500',
  },
  manageMetaBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  manageMetaBtnText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
  inputStaticText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputStaticSubtext: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 10,
  },
  detailTitle: {
  color: TEXT,
  fontSize: 30,
  fontWeight: '800',
  marginBottom: 20,
},
});