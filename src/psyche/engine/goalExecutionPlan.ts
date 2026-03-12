import type {
  GoalCalendarBlockPlan,
  GoalExecutionPlan,
  GoalHabitPlan,
  GoalIntensityPreset,
  GoalMilestone,
  GoalTodoPlan,
  PsycheGoal,
} from '../types';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolvePreset(goal: PsycheGoal): GoalIntensityPreset {
  if (goal.intensityPreset) return goal.intensityPreset;
  const value = goal.constraints.intensity ?? 3;
  if (value <= 2) return 'gentle';
  if (value === 3) return 'balanced';
  if (value === 4) return 'ambitious';
  return 'extreme';
}

function presetFactor(preset: GoalIntensityPreset) {
  switch (preset) {
    case 'gentle':
      return 0.82;
    case 'balanced':
      return 1;
    case 'ambitious':
      return 1.2;
    case 'extreme':
      return 1.4;
    default:
      return 1;
  }
}

function buildStartTime(
  preferredTime: PsycheGoal['constraints']['preferredTime'],
  index: number
) {
  if (preferredTime === 'morning') {
    const hour = 7 + (index % 3);
    return `${pad(hour)}:00`;
  }
  if (preferredTime === 'afternoon') {
    const hour = 13 + (index % 3);
    return `${pad(hour)}:00`;
  }
  if (preferredTime === 'evening') {
    const hour = 18 + (index % 3);
    return `${pad(hour)}:00`;
  }
  const mixed = [8, 14, 19];
  return `${pad(mixed[index % mixed.length])}:00`;
}

function buildDays(count: number) {
  const labels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  return labels.slice(0, clamp(count, 1, 7));
}

function buildHabitDifficulty(minutes: number): 'light' | 'medium' | 'deep' {
  if (minutes <= 20) return 'light';
  if (minutes <= 40) return 'medium';
  return 'deep';
}

function scaledMinutes(goal: PsycheGoal, preset: GoalIntensityPreset) {
  const factor = presetFactor(preset);
  return clamp(Math.round(goal.constraints.minutesPerDay * factor), 10, 180);
}

function scaledDays(goal: PsycheGoal, preset: GoalIntensityPreset) {
  const factor = presetFactor(preset);
  return clamp(Math.round(goal.constraints.availableDaysPerWeek * factor), 1, 7);
}

function buildMusicPlan(goal: PsycheGoal, preset: GoalIntensityPreset): GoalExecutionPlan {
  const days = buildDays(scaledDays(goal, preset));
  const duration = scaledMinutes(goal, preset);

  const habits: GoalHabitPlan[] = [
    {
      id: `${goal.id}-habit-main`,
      title: 'Hauptübung: langsame saubere Wiederholung',
      reason: 'Sicherheit und Technik entstehen durch kontrollierte Wiederholung.',
      frequencyPerWeek: Math.max(3, days.length),
      durationMinutes: duration,
      difficulty: buildHabitDifficulty(duration),
    },
    {
      id: `${goal.id}-habit-tech`,
      title: 'Technikblock: Finger, Rhythmus, Koordination',
      reason: 'Technische Engpässe müssen separat trainiert werden.',
      frequencyPerWeek: Math.max(2, Math.ceil(days.length / 2)),
      durationMinutes: Math.max(12, Math.round(duration * 0.45)),
      difficulty: 'light',
    },
    {
      id: `${goal.id}-habit-review`,
      title: 'Review: Fehler markieren und Abschnitt wählen',
      reason: 'Reflexion verhindert blindes Durchspielen.',
      frequencyPerWeek: 1,
      durationMinutes: 15,
      difficulty: 'light',
    },
  ];

  const todos: GoalTodoPlan[] = [
    {
      id: `${goal.id}-todo-1`,
      title: 'Kleinstes Übungssegment für diese Woche festlegen',
      reason: 'Das große Ziel wird in kontrollierbare Einheiten geteilt.',
      priority: 'high',
      estimatedMinutes: 10,
    },
    {
      id: `${goal.id}-todo-2`,
      title: 'Schwierige Stellen markieren',
      reason: 'Engpässe müssen sichtbar werden.',
      priority: 'high',
      estimatedMinutes: 10,
    },
    {
      id: `${goal.id}-todo-3`,
      title: 'Fingersatz oder Übestrategie festhalten',
      reason: 'Klare Entscheidungen reduzieren Reibung.',
      priority: 'medium',
      estimatedMinutes: 10,
    },
    {
      id: `${goal.id}-todo-4`,
      title: 'Am Wochenende eine saubere Gesamtwiederholung aufnehmen',
      reason: 'Objektives Feedback zeigt echten Fortschritt.',
      priority: 'medium',
      estimatedMinutes: 20,
    },
  ];

  const calendarBlocks: GoalCalendarBlockPlan[] = days.map((day, index) => ({
    id: `${goal.id}-calendar-${index}`,
    title: index % 3 === 2 ? 'Musik: Technik / Review' : 'Musik: Fokusübung',
    reason: 'Feste Termine erhöhen die Umsetzungswahrscheinlichkeit.',
    dayLabel: day,
    startTime: buildStartTime(goal.constraints.preferredTime, index),
    durationMinutes: index % 3 === 2 ? Math.max(15, Math.round(duration * 0.6)) : duration,
  }));

  return { intensityPreset: preset, habits, todos, calendarBlocks };
}

function buildFitnessPlan(goal: PsycheGoal, preset: GoalIntensityPreset): GoalExecutionPlan {
  const days = buildDays(scaledDays(goal, preset));
  const duration = scaledMinutes(goal, preset);

  const habits: GoalHabitPlan[] = [
    {
      id: `${goal.id}-habit-main`,
      title: 'Haupttraining konsequent durchführen',
      reason: 'Konstanz ist wichtiger als einzelne perfekte Tage.',
      frequencyPerWeek: Math.max(3, days.length),
      durationMinutes: duration,
      difficulty: buildHabitDifficulty(duration),
    },
    {
      id: `${goal.id}-habit-recovery`,
      title: 'Regeneration, Schlaf oder Mobility pflegen',
      reason: 'Fortschritt braucht Belastung plus Erholung.',
      frequencyPerWeek: 3,
      durationMinutes: 15,
      difficulty: 'light',
    },
  ];

  const todos: GoalTodoPlan[] = [
    {
      id: `${goal.id}-todo-1`,
      title: 'Trainingsorte und Equipment klären',
      reason: 'Startbarrieren müssen vorher entfernt werden.',
      priority: 'high',
      estimatedMinutes: 15,
    },
    {
      id: `${goal.id}-todo-2`,
      title: 'Diese Woche konkrete Trainingseinheiten festlegen',
      reason: 'Ein Ziel braucht feste Slots.',
      priority: 'high',
      estimatedMinutes: 10,
    },
    {
      id: `${goal.id}-todo-3`,
      title: 'Messgröße für Fortschritt festlegen',
      reason: 'Nur sichtbarer Fortschritt bleibt motivierend.',
      priority: 'medium',
      estimatedMinutes: 10,
    },
  ];

  const calendarBlocks: GoalCalendarBlockPlan[] = days.map((day, index) => ({
    id: `${goal.id}-calendar-${index}`,
    title: index % 3 === 2 ? 'Fitness: leicht / Regeneration' : 'Fitness: Training',
    reason: 'Feste Wiederholung stabilisiert die Gewohnheit.',
    dayLabel: day,
    startTime: buildStartTime(goal.constraints.preferredTime, index),
    durationMinutes: index % 3 === 2 ? Math.max(15, Math.round(duration * 0.6)) : duration,
  }));

  return { intensityPreset: preset, habits, todos, calendarBlocks };
}

function buildStudyLanguagePlan(goal: PsycheGoal, preset: GoalIntensityPreset): GoalExecutionPlan {
  const days = buildDays(scaledDays(goal, preset));
  const duration = scaledMinutes(goal, preset);

  const habits: GoalHabitPlan[] = [
    {
      id: `${goal.id}-habit-main`,
      title: 'Lernblock mit klarem Tagesziel',
      reason: 'Ein klarer Output pro Einheit verhindert Pseudo-Lernen.',
      frequencyPerWeek: Math.max(4, days.length),
      durationMinutes: duration,
      difficulty: buildHabitDifficulty(duration),
    },
    {
      id: `${goal.id}-habit-review`,
      title: 'Wiederholen und aktiv abrufen',
      reason: 'Behalten entsteht durch Abruf, nicht nur Lesen.',
      frequencyPerWeek: 2,
      durationMinutes: Math.max(15, Math.round(duration * 0.5)),
      difficulty: 'light',
    },
  ];

  const todos: GoalTodoPlan[] = [
    {
      id: `${goal.id}-todo-1`,
      title: 'Stoff in kleine Wochenpakete aufteilen',
      reason: 'Große Lernmengen werden real machbar.',
      priority: 'high',
      estimatedMinutes: 20,
    },
    {
      id: `${goal.id}-todo-2`,
      title: 'Schwächste Themen identifizieren',
      reason: 'Mehr Fortschritt entsteht an Engpässen.',
      priority: 'high',
      estimatedMinutes: 15,
    },
    {
      id: `${goal.id}-todo-3`,
      title: 'Test, Wiederholung oder Mini-Abfrage einplanen',
      reason: 'Anwendung zeigt, ob Wissen wirklich sitzt.',
      priority: 'medium',
      estimatedMinutes: 15,
    },
  ];

  const calendarBlocks: GoalCalendarBlockPlan[] = days.map((day, index) => ({
    id: `${goal.id}-calendar-${index}`,
    title: index % 4 === 3 ? 'Lernen: Review / Test' : 'Lernen: Fokusblock',
    reason: 'Regelmäßige Lernblöcke schlagen spontane Motivation.',
    dayLabel: day,
    startTime: buildStartTime(goal.constraints.preferredTime, index),
    durationMinutes: duration,
  }));

  return { intensityPreset: preset, habits, todos, calendarBlocks };
}

function buildDefaultPlan(goal: PsycheGoal, preset: GoalIntensityPreset): GoalExecutionPlan {
  const days = buildDays(scaledDays(goal, preset));
  const duration = scaledMinutes(goal, preset);

  const habits: GoalHabitPlan[] = [
    {
      id: `${goal.id}-habit-main`,
      title: 'Täglicher kleiner Fortschrittsblock',
      reason: 'Kleine feste Schritte sind langfristig stabiler.',
      frequencyPerWeek: days.length,
      durationMinutes: duration,
      difficulty: buildHabitDifficulty(duration),
    },
  ];

  const todos: GoalTodoPlan[] = [
    {
      id: `${goal.id}-todo-1`,
      title: 'Nächsten klaren Teilschritt definieren',
      reason: 'Klarheit reduziert Aufschieben.',
      priority: 'high',
      estimatedMinutes: 10,
    },
    {
      id: `${goal.id}-todo-2`,
      title: 'Hauptproblem für diese Woche benennen',
      reason: 'Engpassfokus beschleunigt Fortschritt.',
      priority: 'medium',
      estimatedMinutes: 10,
    },
  ];

  const calendarBlocks: GoalCalendarBlockPlan[] = days.map((day, index) => ({
    id: `${goal.id}-calendar-${index}`,
    title: 'Ziel: Fortschrittsblock',
    reason: 'Zeit reservieren macht das Ziel real.',
    dayLabel: day,
    startTime: buildStartTime(goal.constraints.preferredTime, index),
    durationMinutes: duration,
  }));

  return { intensityPreset: preset, habits, todos, calendarBlocks };
}

export function buildExecutionPlan(
  goal: PsycheGoal,
  preset: GoalIntensityPreset = resolvePreset(goal)
): GoalExecutionPlan {
  switch (goal.category) {
    case 'music':
      return buildMusicPlan(goal, preset);
    case 'fitness':
      return buildFitnessPlan(goal, preset);
    case 'study':
    case 'language':
      return buildStudyLanguagePlan(goal, preset);
    default:
      return buildDefaultPlan(goal, preset);
  }
}

export function buildDynamicMilestones(goal: PsycheGoal): GoalMilestone[] {
  switch (goal.category) {
    case 'music':
      return [
        { id: 'm1', title: 'Stückstruktur verstehen', description: 'Abschnitte, Schwierigkeit und Reihenfolge sind klar.', targetPercent: 12, status: 'active' },
        { id: 'm2', title: 'Schwierige Stellen einzeln kontrollieren', description: 'Die härtesten Passagen sind separat trainierbar.', targetPercent: 28, status: 'locked' },
        { id: 'm3', title: 'Abschnitte sicher spielen', description: 'Mehrere Segmente funktionieren verlässlich.', targetPercent: 48, status: 'locked' },
        { id: 'm4', title: 'Teile verbinden', description: 'Abschnitte werden flüssig zusammengeführt.', targetPercent: 68, status: 'locked' },
        { id: 'm5', title: 'Stabil und musikalisch', description: 'Das Stück ist kontrolliert und wirkt geschlossen.', targetPercent: 85, status: 'locked' },
        { id: 'm6', title: 'Zielniveau erreicht', description: 'Das gewünschte Ergebnis ist real erreicht.', targetPercent: 100, status: 'locked' },
      ];
    case 'fitness':
      return [
        { id: 'm1', title: 'Rhythmus startet', description: 'Die ersten festen Einheiten laufen.', targetPercent: 15, status: 'active' },
        { id: 'm2', title: 'Konstanz entsteht', description: 'Mehrere Wochen werden stabil eingehalten.', targetPercent: 35, status: 'locked' },
        { id: 'm3', title: 'Leistung steigt sichtbar', description: 'Kraft, Ausdauer oder Form entwickeln sich.', targetPercent: 55, status: 'locked' },
        { id: 'm4', title: 'Fortschritt stabilisiert sich', description: 'Ergebnisse sind wiederholbar.', targetPercent: 78, status: 'locked' },
        { id: 'm5', title: 'Zielzustand erreicht', description: 'Das Zielbild ist praktisch erreicht.', targetPercent: 100, status: 'locked' },
      ];
    case 'study':
    case 'language':
      return [
        { id: 'm1', title: 'Stoff oder Themenkarte klar', description: 'Das Zielgebiet ist in Module aufgeteilt.', targetPercent: 14, status: 'active' },
        { id: 'm2', title: 'Grundlagen sitzen', description: 'Die Basis ist nicht mehr instabil.', targetPercent: 32, status: 'locked' },
        { id: 'm3', title: 'Anwendung gelingt', description: 'Wissen kann aktiv benutzt werden.', targetPercent: 55, status: 'locked' },
        { id: 'm4', title: 'Sicherheit steigt', description: 'Aufgaben gelingen deutlich stabiler.', targetPercent: 78, status: 'locked' },
        { id: 'm5', title: 'Zielniveau erreicht', description: 'Der angestrebte Stand ist praktisch da.', targetPercent: 100, status: 'locked' },
      ];
    default:
      return [
        { id: 'm1', title: 'Start definiert', description: 'Ausgangslage und erster Teilschritt sind klar.', targetPercent: 15, status: 'active' },
        { id: 'm2', title: 'Erster echter Fortschritt', description: 'Nicht nur geplant, sondern umgesetzt.', targetPercent: 35, status: 'locked' },
        { id: 'm3', title: 'Rhythmus aufgebaut', description: 'Das Ziel lebt im Alltag.', targetPercent: 60, status: 'locked' },
        { id: 'm4', title: 'Stabilisierung', description: 'Fortschritt wird wiederholbar.', targetPercent: 82, status: 'locked' },
        { id: 'm5', title: 'Ziel erreicht', description: 'Das gewünschte Ergebnis ist praktisch da.', targetPercent: 100, status: 'locked' },
      ];
  }
}