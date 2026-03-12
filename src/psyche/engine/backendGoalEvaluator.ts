import dayjs from 'dayjs';
import type { PsycheGoal } from '../types';

export type BackendGoalEvaluation = {
  feasibility: 'strong' | 'good' | 'shaky' | 'weak' | 'critical';
  structureQuality: 'clear' | 'usable' | 'blurry' | 'unclear';
  planPressure: 'light' | 'balanced' | 'high' | 'extreme';
  mainRisk: string;
  secondaryRisks: string[];
  shouldReduceScope: boolean;
  shouldIncreaseStructure: boolean;
  shouldAddMiniSteps: boolean;
  shouldSuggestDeadlineShift: boolean;
  suggestedDeadlineShiftDays: number;
  summary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getGoalClarity(goal: PsycheGoal) {
  let score = 40;

  if (goal.targetOutcome && goal.targetOutcome.trim().length >= 10) score += 20;
  if (goal.diagnostic.currentLevelLabel && goal.diagnostic.currentLevelLabel.trim().length >= 6) score += 10;
  if (goal.diagnostic.blockers.length > 0) score += 10;
  if (goal.milestones.length >= 4) score += 10;
  if (goal.executionPlan?.todos?.length) score += 5;
  if (goal.executionPlan?.calendarBlocks?.length) score += 5;

  return clamp(score);
}

function getPressure(goal: PsycheGoal) {
  const deadlineWeeks = Math.max(1, dayjs(goal.targetDate).diff(dayjs(goal.startDate), 'week', true));
  const estimated = Math.max(1, goal.requirements.estimatedWeeksNeeded);

  const ratio = estimated / deadlineWeeks;

  if (ratio >= 1.7) return { label: 'extreme' as const, score: 92 };
  if (ratio >= 1.25) return { label: 'high' as const, score: 76 };
  if (ratio >= 0.9) return { label: 'balanced' as const, score: 55 };
  return { label: 'light' as const, score: 32 };
}

function getFeasibility(goal: PsycheGoal, clarityScore: number, pressureScore: number) {
  let score = 50;

  score += Math.round(goal.diagnostic.realismScore * 0.45);
  score += Math.round(clarityScore * 0.20);
  score -= Math.round(pressureScore * 0.25);

  if (goal.constraints.availableDaysPerWeek >= 4) score += 8;
  if (goal.constraints.minutesPerDay >= 30) score += 6;
  if (goal.constraints.learningSpeed === 'fast') score += 5;
  if (goal.constraints.learningSpeed === 'slow') score -= 5;
  if (goal.diagnostic.estimatedDifficulty === 'very_hard') score -= 10;
  if (goal.diagnostic.estimatedDifficulty === 'hard') score -= 6;

  const clamped = clamp(score);

  if (clamped >= 82) return { label: 'strong' as const, score: clamped };
  if (clamped >= 68) return { label: 'good' as const, score: clamped };
  if (clamped >= 52) return { label: 'shaky' as const, score: clamped };
  if (clamped >= 36) return { label: 'weak' as const, score: clamped };
  return { label: 'critical' as const, score: clamped };
}

function inferMainRisk(goal: PsycheGoal, clarityScore: number, pressureScore: number) {
  if (pressureScore >= 80) return 'Deadline zu aggressiv';
  if (clarityScore <= 45) return 'Zielbild noch zu unklar';
  if (goal.constraints.availableDaysPerWeek <= 2) return 'Zu wenig Wiederholung pro Woche';
  if (goal.constraints.minutesPerDay < 20) return 'Einheiten zu kurz';
  if (goal.diagnostic.blockers.length > 0) return goal.diagnostic.blockers[0];
  return 'Konstanz im Alltag';
}

function inferSecondaryRisks(goal: PsycheGoal, clarityScore: number, pressureScore: number) {
  const risks: string[] = [];

  if (pressureScore >= 70) risks.push('zu hoher Zeitdruck');
  if (clarityScore <= 50) risks.push('fehlende Zielklarheit');
  if (goal.constraints.availableDaysPerWeek <= 2) risks.push('zu wenige Arbeitstage');
  if (goal.constraints.minutesPerDay < 20) risks.push('zu geringe Sessiondauer');
  if (goal.constraints.stressTolerance === 'low' && pressureScore >= 65) {
    risks.push('Druck könnte zu Abbruch führen');
  }
  if (goal.diagnostic.estimatedDifficulty === 'very_hard') {
    risks.push('großer Fähigkeitsabstand');
  }

  return risks.slice(0, 4);
}

export function evaluateGoalBackend(goal: PsycheGoal): BackendGoalEvaluation {
  const clarityScore = getGoalClarity(goal);
  const pressure = getPressure(goal);
  const feasibility = getFeasibility(goal, clarityScore, pressure.score);

  const structureQuality =
    clarityScore >= 78
      ? 'clear'
      : clarityScore >= 62
      ? 'usable'
      : clarityScore >= 46
      ? 'blurry'
      : 'unclear';

  const shouldReduceScope =
    feasibility.label === 'critical' ||
    (feasibility.label === 'weak' && goal.diagnostic.estimatedDifficulty === 'very_hard');

  const shouldIncreaseStructure =
    structureQuality === 'blurry' ||
    structureQuality === 'unclear' ||
    goal.diagnostic.estimatedDifficulty === 'hard' ||
    goal.diagnostic.estimatedDifficulty === 'very_hard';

  const shouldAddMiniSteps =
    goal.milestones.length < 5 ||
    goal.diagnostic.estimatedDifficulty === 'hard' ||
    goal.diagnostic.estimatedDifficulty === 'very_hard';

  const shouldSuggestDeadlineShift =
    pressure.label === 'extreme' || feasibility.label === 'critical';

  const suggestedDeadlineShiftDays =
    shouldSuggestDeadlineShift
      ? goal.diagnostic.estimatedDifficulty === 'very_hard'
        ? 42
        : goal.diagnostic.estimatedDifficulty === 'hard'
        ? 28
        : 14
      : 0;

  const mainRisk = inferMainRisk(goal, clarityScore, pressure.score);
  const secondaryRisks = inferSecondaryRisks(goal, clarityScore, pressure.score);

  const summary =
    feasibility.label === 'strong'
      ? 'Das Ziel ist aktuell gut tragbar, wenn der Plan wirklich eingehalten wird.'
      : feasibility.label === 'good'
      ? 'Das Ziel ist machbar, braucht aber saubere Struktur.'
      : feasibility.label === 'shaky'
      ? 'Das Ziel ist erreichbar, aber nur mit engerer Führung und besserer Konstanz.'
      : feasibility.label === 'weak'
      ? 'Das Ziel ist in der aktuellen Form riskant und sollte genauer strukturiert werden.'
      : 'Das Ziel ist in der aktuellen Form sehr kritisch und sollte reduziert oder zeitlich entlastet werden.';

  return {
    feasibility: feasibility.label,
    structureQuality,
    planPressure: pressure.label,
    mainRisk,
    secondaryRisks,
    shouldReduceScope,
    shouldIncreaseStructure,
    shouldAddMiniSteps,
    shouldSuggestDeadlineShift,
    suggestedDeadlineShiftDays,
    summary,
  };
}