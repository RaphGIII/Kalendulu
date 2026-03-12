import type { GoalIntensityPreset, PsycheGoal } from '../types';
import type { BackendGoalEvaluation } from './backendGoalEvaluator';
import type { GoalAdherenceResult } from './goalAdherence';
import type { GoalStagnationResult } from './goalStagnation';
import { rebuildGoalForIntensity } from './goalRebuild';
import { buildDynamicMilestones, buildExecutionPlan } from './goalExecutionPlan';

export type GoalAdaptationResult = {
  adaptedGoal: PsycheGoal;
  adaptationSummary: string;
  changedIntensity: boolean;
  addedStructure: boolean;
  reducedScopeSignal: boolean;
};

function presetDown(preset?: GoalIntensityPreset): GoalIntensityPreset {
  switch (preset ?? 'balanced') {
    case 'extreme':
      return 'ambitious';
    case 'ambitious':
      return 'balanced';
    case 'balanced':
      return 'gentle';
    default:
      return 'gentle';
  }
}

function presetUp(preset?: GoalIntensityPreset): GoalIntensityPreset {
  switch (preset ?? 'balanced') {
    case 'gentle':
      return 'balanced';
    case 'balanced':
      return 'ambitious';
    case 'ambitious':
      return 'extreme';
    default:
      return 'extreme';
  }
}

export function adaptGoalPlan(params: {
  goal: PsycheGoal;
  backendEvaluation: BackendGoalEvaluation;
  adherence: GoalAdherenceResult;
  stagnation: GoalStagnationResult;
}): GoalAdaptationResult {
  const { goal, backendEvaluation, adherence, stagnation } = params;

  let nextGoal = goal;
  let changedIntensity = false;
  let addedStructure = false;
  let reducedScopeSignal = false;
  const messages: string[] = [];

  const currentPreset =
    goal.executionPlan?.intensityPreset ?? goal.intensityPreset ?? 'balanced';

  if (stagnation.isStagnating && adherence.overallAdherence < 45) {
    const saferPreset = presetDown(currentPreset);
    nextGoal = rebuildGoalForIntensity(nextGoal, saferPreset);
    changedIntensity = true;
    messages.push(`Intensität wurde auf "${saferPreset}" reduziert, damit der Plan tragbarer wird.`);
  } else if (!stagnation.isStagnating && adherence.overallAdherence >= 80 && (goal.progress?.trend === 'up')) {
    const strongerPreset = presetUp(currentPreset);
    if (strongerPreset !== currentPreset) {
      nextGoal = rebuildGoalForIntensity(nextGoal, strongerPreset);
      changedIntensity = true;
      messages.push(`Intensität wurde auf "${strongerPreset}" erhöht, weil der Plan gut getragen wird.`);
    }
  }

  if (backendEvaluation.shouldIncreaseStructure || stagnation.isStagnating) {
    const currentTodos = nextGoal.executionPlan?.todos ?? [];
    const currentHabits = nextGoal.executionPlan?.habits ?? [];
    const currentBlocks = nextGoal.executionPlan?.calendarBlocks ?? [];

    nextGoal = {
      ...nextGoal,
      executionPlan: {
        ...(nextGoal.executionPlan ?? buildExecutionPlan(nextGoal)),
        habits: currentHabits,
        todos: [
          ...currentTodos,
          {
            id: `${nextGoal.id}-todo-review-extra`,
            title: 'Wochenreview: Engpass und nächster Mini-Schritt festlegen',
            reason: 'Mehr Struktur reduziert Verzettelung.',
            priority: 'high',
            estimatedMinutes: 15,
          },
        ],
        calendarBlocks: currentBlocks,
      },
    };

    addedStructure = true;
    messages.push('Ein zusätzlicher Review-Schritt wurde ergänzt, um den Plan enger zu führen.');
  }

  if (backendEvaluation.shouldAddMiniSteps) {
    nextGoal = {
      ...nextGoal,
      milestones: buildDynamicMilestones(nextGoal),
    };
    messages.push('Miniziele wurden verstärkt, damit Fortschritt häufiger sichtbar wird.');
  }

  if (backendEvaluation.shouldReduceScope) {
    reducedScopeSignal = true;
    messages.push('Das Ziel sollte eventuell in eine kleinere Zwischenversion geteilt werden.');
  }

  const existingRecommendation = nextGoal.recommendation;
  nextGoal = {
    ...nextGoal,
    recommendation: {
      ...existingRecommendation,
      summary:
        messages.length > 0
          ? messages.join(' ')
          : existingRecommendation?.summary ??
            'Der Plan wurde überprüft und bleibt vorerst stabil.',
      todayFocus:
        stagnation.isStagnating
          ? 'Heute nur den wichtigsten Engpass mit einem kleinen klaren Schritt bearbeiten.'
          : existingRecommendation?.todayFocus ?? 'Heute einen klaren Fortschrittsblock machen.',
      nextStep:
        reducedScopeSignal
          ? 'Prüfe, ob eine kleinere Zwischenversion des Ziels zuerst erreicht werden sollte.'
          : existingRecommendation?.nextStep ?? 'Den nächsten sinnvollen Schritt absichern.',
    },
  };

  return {
    adaptedGoal: nextGoal,
    adaptationSummary:
      messages.length > 0
        ? messages.join(' ')
        : 'Der Plan braucht aktuell keine größere Anpassung.',
    changedIntensity,
    addedStructure,
    reducedScopeSignal,
  };
}