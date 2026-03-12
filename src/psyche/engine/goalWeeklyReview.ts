import dayjs from 'dayjs';
import type { PsycheGoal } from '../types';
import type { GoalAdherenceResult } from './goalAdherence';
import type { GoalStagnationResult } from './goalStagnation';

export type GoalWeeklyReview = {
  weekLabel: string;
  summary: string;
  wins: string[];
  concerns: string[];
  nextWeekFocus: string[];
  reviewQuestions: string[];
};

export function buildGoalWeeklyReview(params: {
  goal: PsycheGoal;
  adherence: GoalAdherenceResult;
  stagnation: GoalStagnationResult;
}): GoalWeeklyReview {
  const { goal, adherence, stagnation } = params;

  const wins: string[] = [];
  const concerns: string[] = [];
  const nextWeekFocus: string[] = [];

  if (adherence.habitAdherence >= 70) wins.push('Deine Gewohnheitsbasis trägt das Ziel bereits ordentlich.');
  if (adherence.todoAdherence >= 70) wins.push('Geplante konkrete Schritte werden gut umgesetzt.');
  if (adherence.calendarAdherence >= 70) wins.push('Fokuszeit wird real im Alltag verankert.');
  if ((goal.progress?.trend ?? 'steady') === 'up') wins.push('Der Trend zeigt nach oben.');

  if (adherence.habitAdherence < 50) concerns.push('Die Habit-Frequenz ist aktuell zu niedrig.');
  if (adherence.todoAdherence < 50) concerns.push('Zu wenige klare Aufgaben werden abgeschlossen.');
  if (adherence.calendarAdherence < 50) concerns.push('Der Plan hat noch zu wenig echten Platz im Kalender.');
  if (stagnation.isStagnating) concerns.push(stagnation.reason);

  if (stagnation.isStagnating) {
    nextWeekFocus.push('Engpass zuerst bearbeiten, nicht den ganzen Plan gleichzeitig.');
    nextWeekFocus.push('Mini-Schritte verkleinern und täglich sichtbare Abschlüsse erzeugen.');
  } else {
    nextWeekFocus.push('Bestehenden Rhythmus stabil halten und unnötige Änderungen vermeiden.');
  }

  if ((goal.progress?.executionScore ?? 0) < 50) {
    nextWeekFocus.push('Mehr echte Umsetzung statt nur Analyse oder Planung.');
  }

  if ((goal.progress?.metricScore ?? 0) < 45) {
    nextWeekFocus.push('Mehr Blöcke mit messbarem Ergebnis statt diffusem Arbeiten.');
  }

  const reviewQuestions = [
    'Welcher Schritt hat diese Woche wirklich Fortschritt erzeugt?',
    'Wo war die größte Reibung beim Dranbleiben?',
    'Welche Einheit war am leichtesten umsetzbar?',
    'Was sollte nächste Woche kleiner, klarer oder fester geplant werden?',
  ];

  return {
    weekLabel: `${dayjs().startOf('week').format('DD.MM')} – ${dayjs().endOf('week').format('DD.MM')}`,
    summary: stagnation.isStagnating
      ? 'Diese Woche braucht das Ziel mehr Führung und engere Struktur.'
      : 'Diese Woche zeigt, dass das Ziel durch gute Führung weiter tragbar ist.',
    wins,
    concerns,
    nextWeekFocus: nextWeekFocus.slice(0, 4),
    reviewQuestions,
  };
}