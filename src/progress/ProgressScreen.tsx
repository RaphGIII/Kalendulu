import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlannerBundle, PlannerExecutionStep } from '../psyche/types';

const BG = '#2E437A';
const BG_DARK = '#233A73';
const CARD = '#314A86';
const CARD_DARK = '#243D77';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';
const GOLD = '#D4AF37';
const SUCCESS = '#7CE0A3';

const PLAN_STORAGE_KEY = 'kalendulu_ai_goal_plans_v2';
const STEP_STATE_KEY = 'kalendulu_ai_goal_step_state_v2';

type StoredGoalPlan = {
  id: string;
  title: string;
  createdAt: string;
  refinement: unknown;
  planner: PlannerBundle;
};

type StepItemState = Record<string, boolean>;
type GoalStepState = Record<string, StepItemState>;
type StepState = Record<string, GoalStepState>;

function buildLineStyle(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return {
    position: 'absolute' as const,
    left: x1,
    top: y1,
    width: length,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: `${angle}rad` }],
  };
}

function getNodePositions(count: number) {
  if (count <= 1) return [{ x: 230, y: 255 }];

  const leftXs = [220, 165, 115, 80, 55, 38];
  const rightXs = [245, 270, 295, 315, 330, 340];
  const topY = 42;
  const bottomY = 255;
  const gap = (bottomY - topY) / Math.max(count - 1, 1);

  return Array.from({ length: count }).map((_, index) => {
    const y = bottomY - gap * index;
    const x =
      index === count - 1
        ? 195
        : index % 2 === 0
          ? leftXs[Math.min(index, leftXs.length - 1)]
          : rightXs[Math.min(index, rightXs.length - 1)];

    return { x, y };
  });
}

function getItemChecked(
  state: StepState,
  goalId: string,
  stepId: string,
  itemId: string,
  fallback = false,
) {
  const goalState = state[goalId];
  if (!goalState) return fallback;

  const stepState = goalState[stepId];
  if (!stepState) return fallback;

  const value = stepState[itemId];
  return typeof value === 'boolean' ? value : fallback;
}

function progressForStep(step: PlannerExecutionStep, state: StepState, goalId: string) {
  const checklist = step.checklist ?? [];
  const done = checklist.filter((item) =>
    getItemChecked(state, goalId, step.id, item.id, item.done ?? false),
  ).length;

  return {
    done,
    total: checklist.length,
    complete: checklist.length > 0 && done === checklist.length,
  };
}

export default function ProgressScreen() {
  const [plans, setPlans] = useState<StoredGoalPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stepState, setStepState] = useState<StepState>({});

  useEffect(() => {
    (async () => {
      try {
        const rawPlans = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
        const rawState = await AsyncStorage.getItem(STEP_STATE_KEY);

        setPlans(rawPlans ? (JSON.parse(rawPlans) as StoredGoalPlan[]) : []);
        setStepState(rawState ? (JSON.parse(rawState) as StepState) : {});
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedId) ?? null,
    [plans, selectedId],
  );

  const selectedSteps = selectedPlan?.planner.executionSteps ?? [];

  const currentIndex = useMemo(() => {
    if (!selectedPlan) return 0;

    const index = selectedSteps.findIndex((step) => {
      const p = progressForStep(step, stepState, selectedPlan.id);
      return !p.complete;
    });

    return index >= 0 ? index : Math.max(selectedSteps.length - 1, 0);
  }, [selectedPlan, selectedSteps, stepState]);

  const positions = useMemo(() => getNodePositions(selectedSteps.length), [selectedSteps.length]);

  async function toggleChecklist(goalId: string, stepId: string, itemId: string) {
    const current = getItemChecked(stepState, goalId, stepId, itemId, false);

    const next: StepState = {
      ...stepState,
      [goalId]: {
        ...(stepState[goalId] ?? {}),
        [stepId]: {
          ...(stepState[goalId]?.[stepId] ?? {}),
          [itemId]: !current,
        },
      },
    };

    setStepState(next);
    await AsyncStorage.setItem(STEP_STATE_KEY, JSON.stringify(next));
  }

  if (!selectedPlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Fortschritt</Text>
            <Text style={styles.heroSubtitle}>
              Hier siehst du nur deine Ziele. Klick auf ein Ziel und arbeite dann den Berg Schritt für Schritt hoch.
            </Text>
          </View>

          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Deine Ziele</Text>

            {!plans.length ? (
              <Text style={styles.emptyText}>
                Noch kein gespeicherter KI-Plan vorhanden. Erstelle zuerst im Psyche-Tab ein Ziel.
              </Text>
            ) : (
              plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedId(plan.id)}
                  style={styles.goalCard}
                >
                  <Text style={styles.goalTitle}>{plan.title}</Text>
                  <Text style={styles.goalMeta}>
                    {plan.planner.executionSteps?.length ?? 0} Schritte
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Pressable onPress={() => setSelectedId(null)} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zurück zur Liste</Text>
          </Pressable>

          <Text style={styles.heroTitle}>{selectedPlan.title}</Text>
          <Text style={styles.heroSubtitle}>
            Arbeite einfach die Punkte ab. Mit jedem Haken steigst du höher auf den Berg.
          </Text>
        </View>

        <View style={styles.mountainCard}>
          <Text style={styles.sectionTitle}>Dein Weg zum Ziel</Text>

          <View style={styles.mountainStage}>
            <View style={styles.mountainLeft} />
            <View style={styles.mountainRight} />
            <Text style={styles.flag}>🚩</Text>

            {positions.map((pos, index) => {
              const step = selectedSteps[index];
              const done = progressForStep(step, stepState, selectedPlan.id).complete;
              const active = index === currentIndex;

              return (
                <View
                  key={step.id}
                  style={[
                    styles.node,
                    {
                      left: pos.x,
                      top: pos.y,
                    },
                    done && styles.nodeDone,
                    active && styles.nodeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.nodeText,
                      done && styles.nodeTextDone,
                      active && styles.nodeTextActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
              );
            })}

            {positions.slice(0, -1).map((pos, index) => {
              const next = positions[index + 1];
              return (
                <View
                  key={`line_${index}`}
                  style={buildLineStyle(pos.x + 11, pos.y + 11, next.x + 11, next.y + 11)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.sectionTitle}>Schritte</Text>

          {selectedSteps.map((step, index) => {
            const p = progressForStep(step, stepState, selectedPlan.id);
            const isLocked = index > currentIndex;
            const isActive = index === currentIndex;

            return (
              <View
                key={step.id}
                style={[
                  styles.stepCard,
                  isActive && styles.stepCardActive,
                  p.complete && styles.stepCardDone,
                ]}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepHeaderTitle}>
                    STEP {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.stepHeaderState}>
                    {p.complete ? 'Erledigt' : isLocked ? 'Gesperrt' : 'Aktuell'}
                  </Text>
                </View>

                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.explanation}</Text>

                <View style={{ marginTop: 12, gap: 10 }}>
                  {step.checklist.map((item) => {
                    const checked = getItemChecked(
                      stepState,
                      selectedPlan.id,
                      step.id,
                      item.id,
                      item.done ?? false,
                    );

                    return (
                      <Pressable
                        key={item.id}
                        disabled={isLocked}
                        onPress={() => toggleChecklist(selectedPlan.id, step.id, item.id)}
                        style={[
                          styles.checkItem,
                          checked && styles.checkItemDone,
                          isLocked && styles.checkItemLocked,
                        ]}
                      >
                        <View style={[styles.checkCircle, checked && styles.checkCircleDone]}>
                          {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                        </View>
                        <Text style={[styles.checkText, checked && styles.checkTextDone]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
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
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSubtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  listCard: {
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
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  goalCard: {
    marginTop: 12,
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  goalTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '900',
  },
  goalMeta: {
    color: MUTED,
    fontSize: 13,
    marginTop: 6,
  },
  mountainCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  mountainStage: {
    marginTop: 16,
    height: 300,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#E8E8E8',
  },
  mountainLeft: {
    position: 'absolute',
    left: 35,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 140,
    borderRightWidth: 70,
    borderBottomWidth: 235,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4D4D4D',
  },
  mountainRight: {
    position: 'absolute',
    left: 145,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 55,
    borderRightWidth: 150,
    borderBottomWidth: 235,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#6A6A6A',
  },
  flag: {
    position: 'absolute',
    top: 20,
    left: 186,
    fontSize: 24,
  },
  node: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    backgroundColor: SUCCESS,
    borderColor: SUCCESS,
  },
  nodeActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
    transform: [{ scale: 1.1 }],
  },
  nodeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B44',
  },
  nodeTextDone: {
    color: '#163223',
  },
  nodeTextActive: {
    color: '#13213F',
  },
  stepsCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stepCard: {
    marginTop: 14,
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stepCardActive: {
    borderColor: 'rgba(212,175,55,0.40)',
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  stepCardDone: {
    borderColor: 'rgba(124,224,163,0.30)',
    backgroundColor: 'rgba(124,224,163,0.06)',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  stepHeaderTitle: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 12,
  },
  stepHeaderState: {
    color: MUTED,
    fontWeight: '800',
    fontSize: 12,
  },
  stepTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 17,
    marginTop: 6,
  },
  stepText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  checkItemDone: {
    backgroundColor: 'rgba(124,224,163,0.10)',
    borderColor: 'rgba(124,224,163,0.22)',
  },
  checkItemLocked: {
    opacity: 0.5,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: SUCCESS,
    borderColor: SUCCESS,
  },
  checkMark: {
    color: '#163223',
    fontWeight: '900',
  },
  checkText: {
    color: TEXT,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  checkTextDone: {
    color: SUCCESS,
    fontWeight: '800',
  },
});