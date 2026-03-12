import type { GoalIntensityPreset, PsycheGoal } from '../types';
import { buildDynamicMilestones, buildExecutionPlan } from './goalExecutionPlan';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function presetToConstraintIntensity(preset: GoalIntensityPreset): 1 | 2 | 3 | 4 | 5 {
  switch (preset) {
    case 'gentle':
      return 2;
    case 'balanced':
      return 3;
    case 'ambitious':
      return 4;
    case 'extreme':
      return 5;
    default:
      return 3;
  }
}

function presetFactor(preset: GoalIntensityPreset) {
  switch (preset) {
    case 'gentle':
      return 0.85;
    case 'balanced':
      return 1;
    case 'ambitious':
      return 1.18;
    case 'extreme':
      return 1.35;
    default:
      return 1;
  }
}

export function rebuildGoalForIntensity(
  goal: PsycheGoal,
  preset: GoalIntensityPreset
): PsycheGoal {
  const factor = presetFactor(preset);

  const nextConstraints = {
    ...goal.constraints,
    intensity: presetToConstraintIntensity(preset),
    minutesPerDay: clamp(Math.round(goal.constraints.minutesPerDay * factor), 10, 180),
    availableDaysPerWeek: clamp(
      Math.round(goal.constraints.availableDaysPerWeek * factor),
      1,
      7
    ),
  };

  const nextRequirements = {
    ...goal.requirements,
    requiredMinutesPerWeek: Math.max(
      30,
      nextConstraints.minutesPerDay * nextConstraints.availableDaysPerWeek
    ),
    requiredHabitsPerWeek: Math.max(2, Math.min(7, nextConstraints.availableDaysPerWeek)),
    requiredFocusBlocksPerWeek: Math.max(
      2,
      Math.ceil(nextConstraints.availableDaysPerWeek * (preset === 'gentle' ? 0.55 : 0.75))
    ),
    requiredTodosPerWeek:
      preset === 'extreme' ? Math.max(goal.requirements.requiredTodosPerWeek, 5)
      : preset === 'ambitious' ? Math.max(goal.requirements.requiredTodosPerWeek, 4)
      : Math.max(3, goal.requirements.requiredTodosPerWeek - 1),
  };

  const nextGoal: PsycheGoal = {
    ...goal,
    intensityPreset: preset,
    constraints: nextConstraints,
    requirements: nextRequirements,
    recommendation: {
      ...goal.recommendation,
      summary: `Plan neu berechnet auf Intensität "${preset}". Du brauchst aktuell etwa ${nextRequirements.requiredMinutesPerWeek} Minuten pro Woche.`,
      todayFocus:
        preset === 'gentle'
          ? 'Heute nur den kleinstmöglichen sauberen Schritt machen.'
          : preset === 'extreme'
          ? 'Heute einen tiefen Fokusblock ohne Ablenkung durchziehen.'
          : goal.recommendation?.todayFocus ?? 'Heute einen klaren Fortschrittsblock machen.',
      nextStep:
        preset === 'ambitious' || preset === 'extreme'
          ? 'Kalenderblöcke konsequent absichern und ohne Ausreden behandeln.'
          : 'Den Plan konstant und ruhig in den Alltag einbauen.',
    },
  };

  return {
    ...nextGoal,
    executionPlan: buildExecutionPlan(nextGoal, preset),
    milestones: buildDynamicMilestones(nextGoal),
  };
}