import { MindsetProfile, PlannerOutput, PsycheGoal, PsycheSignals } from './types';

function topGoal(goals: PsycheGoal[]): string {
  return goals[0]?.title?.trim() || 'dein Hauptziel';
}

export function buildPlannerMock(params: {
  goals: PsycheGoal[];
  profile: MindsetProfile;
  signals: PsycheSignals;
}): PlannerOutput {
  const { goals, profile, signals } = params;
  const mainGoal = topGoal(goals);

  const suggestions = [];
  const reasons = [];

  if (signals.tasksDone7d < 5) {
    suggestions.push({
      id: 'todo-1',
      type: 'todo' as const,
      title: `Kleinsten nächsten Schritt für "${mainGoal}" festlegen`,
      subtitle: '5–10 Minuten, damit der Einstieg leicht wird',
    });

    reasons.push({
      id: 'reason-tasks',
      label: 'To-dos',
      text: 'In den letzten 7 Tagen wurden eher wenige Aufgaben abgeschlossen. Ein kleiner Startschritt senkt Reibung.',
    });
  } else {
    suggestions.push({
      id: 'todo-1',
      type: 'todo' as const,
      title: `"${mainGoal}" in 3 konkrete Aufgaben aufteilen`,
      subtitle: 'Mehr Klarheit für die nächsten Tage',
    });

    reasons.push({
      id: 'reason-clarity',
      label: 'Klarheit',
      text: 'Deine Aktivität ist schon da. Mehr Struktur hilft jetzt mehr als noch mehr Motivation.',
    });
  }

  if (signals.habitActiveDays7d < 4) {
    suggestions.push({
      id: 'habit-1',
      type: 'habit' as const,
      title: `Tägliches Mini-Habit für "${mainGoal}" starten`,
      subtitle: '2 Minuten pro Tag reichen für den Anfang',
    });

    reasons.push({
      id: 'reason-habit',
      label: 'Habits',
      text: 'Deine Gewohnheitskonsistenz ist noch nicht stabil. Ein kleines tägliches Habit ist realistischer als ein großes.',
    });
  } else {
    suggestions.push({
      id: 'habit-1',
      type: 'habit' as const,
      title: `Bestehendes Habit für "${mainGoal}" leicht erhöhen`,
      subtitle: 'Kleiner nächster Schritt statt kompletter Umbau',
    });

    reasons.push({
      id: 'reason-consistency',
      label: 'Konstanz',
      text: 'Du hast bereits eine brauchbare Basis. Eine kleine Steigerung ist sinnvoller als ein Neustart.',
    });
  }

  if (signals.calendarHours7d < 5 || profile.planning < 55) {
    suggestions.push({
      id: 'calendar-1',
      type: 'calendar' as const,
      title: `"${mainGoal}" als festen Fokusblock einplanen`,
      subtitle: '30–45 Minuten im Kalender reservieren',
    });

    reasons.push({
      id: 'reason-calendar',
      label: 'Kalender',
      text: 'Dein Ziel braucht einen festen Platz im Kalender, sonst bleibt es schnell nur eine gute Absicht.',
    });
  } else {
    suggestions.push({
      id: 'calendar-1',
      type: 'calendar' as const,
      title: 'Nächsten Wochenblock bewusst freihalten',
      subtitle: 'Raum für Erholung oder Fokus sichern',
    });

    reasons.push({
      id: 'reason-recovery',
      label: 'Balance',
      text: 'Du planst schon recht aktiv. Ein bewusst freier Block schützt vor Überladung.',
    });
  }

  if (profile.momentum < 45) {
    reasons.push({
      id: 'reason-momentum',
      label: 'Momentum',
      text: 'Dein Momentum wirkt gerade niedrig. Deshalb sind die Vorschläge bewusst klein, konkret und leicht umsetzbar.',
    });
  }

  return {
    suggestions: suggestions.slice(0, 3),
    reasons: reasons.slice(0, 4),
  };
}