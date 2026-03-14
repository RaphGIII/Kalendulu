import { MindsetProfile, PlannerOutput, PsycheGoal, PsycheSignals } from './types';

export function buildPlannerMock(
  goals: PsycheGoal[],
  profile: MindsetProfile,
  signals: PsycheSignals,
): PlannerOutput {
  const goalTitle = goals[0]?.title ?? 'Dein Ziel';
  const summary =
    signals.momentum7d >= 50
      ? 'Du hast schon Bewegung drin. Der Plan hält dich im Rhythmus.'
      : 'Der Plan startet bewusst einfach, damit du wieder sauber reinkommst.';

  return {
    primary: {
      todo: {
        title: `Ersten klaren Schritt für "${goalTitle}" setzen`,
        reason: 'Ein klarer erster Schritt senkt Reibung.',
        instruction: 'Setze heute einen konkreten Startpunkt.',
      },
      habit: {
        title: 'Täglich kurz anfangen',
        reason: 'Kurze Wiederholung macht das Ziel stabil.',
        instruction: 'Mindestens 10 Minuten Fokus.',
      },
      calendar: {
        title: 'Fokusblock',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Ein fester Block macht Umsetzung wahrscheinlicher.',
      },
      routines: [],
      review: {
        reviewAfterDays: 7,
        questions: [
          'Was hat funktioniert?',
          'Was hat gebremst?',
          'Was ist der nächste klare Schritt?',
        ],
      },
    },
    alternatives: [],
    executionSteps: [
      {
        id: 'step_1',
        order: 1,
        title: 'Klar starten',
        explanation: 'Beginne mit einem kleinen, direkten Schritt.',
        whyItMatters: 'Der Start entscheidet über die Umsetzung.',
        checklist: [
          { id: 'c1', label: 'Ersten Schritt festlegen', done: false },
        ],
        linkedTodoTitles: ['Ersten klaren Schritt setzen'],
        linkedHabitTitles: ['Täglich kurz anfangen'],
      },
    ],
    planMeta: {
      depth: 'balanced',
      difficulty: 'medium',
      complexity: 'moderate',
      summary,
    },
    suggestions: [
      {
        id: 's1',
        type: 'todo',
        title: 'Ersten Schritt festlegen',
        subtitle: 'Heute noch konkret machen',
      },
      {
        id: 's2',
        type: 'habit',
        title: '10 Minuten Fokus',
        subtitle: 'Täglich kurz starten',
      },
      {
        id: 's3',
        type: 'calendar',
        title: 'Fokusblock eintragen',
        subtitle: 'Zeit reservieren',
      },
    ],
  };
}