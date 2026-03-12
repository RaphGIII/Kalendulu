import type { GoalPlanRecommendation, PsycheGoal } from '../types';
import type { BackendGoalEvaluation } from './backendGoalEvaluator';

export function refineRecommendation(
  goal: PsycheGoal,
  evaluation: BackendGoalEvaluation
): GoalPlanRecommendation {
  let summary = goal.recommendation?.summary ?? '';
  let todayFocus = goal.recommendation?.todayFocus ?? 'Heute einen klaren Fortschrittsblock machen.';
  let nextStep = goal.recommendation?.nextStep ?? 'Den nächsten sinnvollen Schritt klar festlegen.';
  let warning = goal.recommendation?.warning;

  if (evaluation.feasibility === 'critical' || evaluation.feasibility === 'weak') {
    summary = `${evaluation.summary} Priorität hat jetzt nicht mehr Motivation, sondern Realismus und engere Führung.`;
    todayFocus = 'Heute den wichtigsten Engpass identifizieren und nur dafür einen sauberen Schritt machen.';
    nextStep = evaluation.shouldReduceScope
      ? 'Das Ziel verkleinern oder in eine stärkere Zwischenversion teilen.'
      : 'Plan enger führen, mehr feste Blöcke setzen und Mini-Schritte erhöhen.';
  }

  if (evaluation.shouldIncreaseStructure) {
    nextStep = `${nextStep} Zusätzlich sollten Wochenplan, Review und feste Slots klarer werden.`;
  }

  if (evaluation.shouldSuggestDeadlineShift && evaluation.suggestedDeadlineShiftDays > 0) {
    warning = `Die aktuelle Deadline wirkt zu aggressiv. Eine Verschiebung um ungefähr ${evaluation.suggestedDeadlineShiftDays} Tage könnte realistischer sein.`;
  } else if (!warning && evaluation.secondaryRisks.length > 0) {
    warning = `Achte besonders auf: ${evaluation.secondaryRisks.slice(0, 2).join(', ')}.`;
  }

  return {
    summary,
    todayFocus,
    nextStep,
    warning,
    suggestedDeadlineShiftDays: evaluation.shouldSuggestDeadlineShift
      ? evaluation.suggestedDeadlineShiftDays
      : undefined,
  };
}