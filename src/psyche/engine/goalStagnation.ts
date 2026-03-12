import type { PsycheGoal } from '../types';
import type { GoalAdherenceResult } from './goalAdherence';

export type GoalStagnationResult = {
  isStagnating: boolean;
  severity: 'none' | 'light' | 'medium' | 'high';
  reason: string;
  recommendationHint: string;
};

export function detectGoalStagnation(params: {
  goal: PsycheGoal;
  adherence: GoalAdherenceResult;
}): GoalStagnationResult {
  const { goal, adherence } = params;

  const total = goal.progress?.total ?? 0;
  const trend = goal.progress?.trend ?? 'steady';
  const selfReport = goal.userReportedProgress ?? 0;
  const metricScore = goal.progress?.metricScore ?? 0;

  if (trend === 'up' && adherence.overallAdherence >= 60) {
    return {
      isStagnating: false,
      severity: 'none',
      reason: 'Es gibt aktuell noch sichtbare Bewegung nach vorne.',
      recommendationHint: 'Plan beibehalten und weiter eng führen.',
    };
  }

  if (trend === 'steady' && adherence.overallAdherence >= 70 && total >= 45) {
    return {
      isStagnating: false,
      severity: 'light',
      reason: 'Der Fortschritt läuft eher flach, aber noch nicht problematisch.',
      recommendationHint: 'Kleine Verschärfung bei Fokus oder Output könnte helfen.',
    };
  }

  if (adherence.overallAdherence < 40) {
    return {
      isStagnating: true,
      severity: 'high',
      reason: 'Der Plan wird aktuell zu wenig umgesetzt.',
      recommendationHint: 'Plan vereinfachen, Reibung senken, Sessions kleiner machen.',
    };
  }

  if (trend === 'steady' && total < 40 && metricScore < 35 && selfReport < 40) {
    return {
      isStagnating: true,
      severity: 'medium',
      reason: 'Fortschritt, Metriken und Selbsteinschätzung bleiben zu flach.',
      recommendationHint: 'Mehr Mini-Schritte und klarere Ergebnisblöcke einbauen.',
    };
  }

  if (trend === 'down') {
    return {
      isStagnating: true,
      severity: 'high',
      reason: 'Der Zielverlauf ist rückläufig.',
      recommendationHint: 'Plan sofort neu kalibrieren und Hauptengpass isolieren.',
    };
  }

  return {
    isStagnating: false,
    severity: 'light',
    reason: 'Noch keine klare Stagnation, aber der Plan sollte beobachtet werden.',
    recommendationHint: 'Wöchentliche Review beibehalten.',
  };
}