import type {
  GoalAnswerMap,
  GoalCalendarBlockPlan,
  GoalCategory,
  GoalConstraintProfile,
  GoalDiagnostic,
  GoalDifficulty,
  GoalExecutionPlan,
  GoalHabitPlan,
  GoalIntensityPreset,
  GoalMetric,
  GoalMiniStep,
  GoalMilestone,
  GoalPlanRecommendation,
  GoalPlanRequirements,
  GoalQuestion,
  GoalReviewPrompt,
  GoalTodoPlan,
  PsycheGoal,
  UserPlanningProfile,
} from '../types';

type BuildArgs = {
  title: string;
  category: GoalCategory;
  answers: GoalAnswerMap;
  profile?: UserPlanningProfile | null;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asMulti(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normalizeText(input: string) {
  return input.trim().toLowerCase();
}

function parseRelativeDate(input: string): string | null {
  const text = normalizeText(input);
  if (!text) return null;

  const matchWeeks = text.match(/in\s+(\d+)\s+woche[n]?/i);
  if (matchWeeks) return addDaysIso(Number(matchWeeks[1]) * 7);

  const matchMonths = text.match(/in\s+(\d+)\s+monat(?:en|e)?/i);
  if (matchMonths) {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(matchMonths[1]));
    return d.toISOString();
  }

  const matchDays = text.match(/in\s+(\d+)\s+tag(?:en|e)?/i);
  if (matchDays) return addDaysIso(Number(matchDays[1]));

  if (/nächste[sr]? jahr|kommende[sr]? jahr/i.test(text)) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  }

  if (/dieses jahr/i.test(text)) {
    const d = new Date();
    d.setMonth(11);
    d.setDate(31);
    return d.toISOString();
  }

  return null;
}

function resolveTargetDate(deadlineRaw: string, title: string, outcome: string): string {
  const direct = deadlineRaw ? new Date(deadlineRaw) : null;
  if (direct && !Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const fromDeadline = parseRelativeDate(deadlineRaw);
  if (fromDeadline) return fromDeadline;

  const fromTitle = parseRelativeDate(title);
  if (fromTitle) return fromTitle;

  const fromOutcome = parseRelativeDate(outcome);
  if (fromOutcome) return fromOutcome;

  return addDaysIso(56);
}

function daysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function toDifficulty(weeks: number, minutesPerWeek: number): GoalDifficulty {
  const load = weeks * (minutesPerWeek / 60);
  if (load <= 10) return 'easy';
  if (load <= 20) return 'medium';
  if (load <= 35) return 'hard';
  return 'very_hard';
}

function mapObstacleLabel(id: string): string {
  switch (id) {
    case 'time':
      return 'wenig freie Zeit';
    case 'energy':
      return 'zu wenig Energie';
    case 'focus':
      return 'Ablenkung';
    case 'overwhelm':
      return 'zu große Schritte';
    case 'unclear':
      return 'unklarer nächster Schritt';
    case 'discipline':
      return 'fehlender Rhythmus';
    default:
      return id;
  }
}

function detectIntensity(planStyle: string): GoalIntensityPreset {
  switch (planStyle) {
    case 'small_steps':
      return 'gentle';
    case 'push':
      return 'extreme';
    case 'structured':
      return 'ambitious';
    default:
      return 'balanced';
  }
}

function clampIntensity(n: number): 1 | 2 | 3 | 4 | 5 {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

function mapStressTolerance(obstacles: string[]): GoalConstraintProfile['stressTolerance'] {
  if (obstacles.includes('overwhelm')) return 'low';
  if (obstacles.includes('time') || obstacles.includes('energy')) return 'medium';
  return 'high';
}

function mapLearningSpeed(profile?: UserPlanningProfile | null): GoalConstraintProfile['learningSpeed'] {
  const consistency = profile?.consistencyScore ?? 50;
  if (consistency >= 75) return 'fast';
  if (consistency >= 45) return 'normal';
  return 'slow';
}

function pickWeekdays(daysPerWeek: number): number[] {
  if (daysPerWeek >= 6) return [1, 2, 3, 4, 5, 6];
  if (daysPerWeek === 5) return [1, 2, 3, 4, 5];
  if (daysPerWeek === 4) return [1, 2, 4, 6];
  if (daysPerWeek === 3) return [1, 3, 5];
  return [2, 5];
}

function buildMetrics(category: GoalCategory): GoalMetric[] {
  switch (category) {
    case 'fitness':
      return [
        { id: uid('metric'), label: 'Konstanz', kind: 'consistency', current: 0, target: 100, weight: 0.4, unit: '%' },
        { id: uid('metric'), label: 'Körpergefühl', kind: 'performance', current: 0, target: 100, weight: 0.3, unit: '%' },
        { id: uid('metric'), label: 'Selbstvertrauen', kind: 'confidence', current: 0, target: 100, weight: 0.3, unit: '%' },
      ];
    default:
      return [
        { id: uid('metric'), label: 'Fortschritt', kind: 'output', current: 0, target: 100, weight: 0.4, unit: '%' },
        { id: uid('metric'), label: 'Konstanz', kind: 'consistency', current: 0, target: 100, weight: 0.35, unit: '%' },
        { id: uid('metric'), label: 'Sicherheit', kind: 'confidence', current: 0, target: 100, weight: 0.25, unit: '%' },
      ];
  }
}

function buildMilestones(category: GoalCategory, outcome: string): GoalMilestone[] {
  if (category === 'fitness') {
    return [
      {
        id: uid('milestone'),
        title: 'Trainingsrhythmus festigen',
        description: 'Mehrere Wochen hintereinander feste Einheiten sauber einhalten.',
        targetPercent: 25,
        status: 'active',
      },
      {
        id: uid('milestone'),
        title: 'Ernährung in den Griff bekommen',
        description: 'Die größten Kalorienfehler oder Essensmuster praktisch lösen.',
        targetPercent: 50,
        status: 'locked',
      },
      {
        id: uid('milestone'),
        title: 'Körper sichtbar verändern',
        description: 'Fortschritt wird im Spiegel, Gewicht oder Körpergefühl klarer.',
        targetPercent: 75,
        status: 'locked',
      },
      {
        id: uid('milestone'),
        title: 'Ziel halten statt nur kurz erreichen',
        description: `Der Weg zu "${outcome}" ist nicht nur gestartet, sondern im Alltag verankert.`,
        targetPercent: 100,
        status: 'locked',
      },
    ];
  }

  return [
    {
      id: uid('milestone'),
      title: 'Grundlage aufbauen',
      description: `Du startest sauber und schaffst eine klare Basis für "${outcome}".`,
      targetPercent: 25,
      status: 'active',
    },
    {
      id: uid('milestone'),
      title: 'Rhythmus stabilisieren',
      description: 'Die Umsetzung wird wiederholbar und deutlich einfacher.',
      targetPercent: 50,
      status: 'locked',
    },
    {
      id: uid('milestone'),
      title: 'Qualität anheben',
      description: 'Jetzt geht es nicht nur ums Dranbleiben, sondern um sichtbare Verbesserung.',
      targetPercent: 75,
      status: 'locked',
    },
    {
      id: uid('milestone'),
      title: 'Ziel sauber erreichen',
      description: 'Die letzten Schritte werden fokussiert abgeschlossen.',
      targetPercent: 100,
      status: 'locked',
    },
  ];
}

function buildFitnessMiniSteps(outcome: string, why: string): GoalMiniStep[] {
  return [
    {
      id: uid('mini'),
      order: 1,
      status: 'active',
      title: 'Feste Trainingsstruktur bauen',
      description:
        'Lege feste Trainingstage fest, die du wirklich halten kannst. Ohne festen Wochenrhythmus bleibt Abnehmen meist nur ein Wunsch.',
      linkedTodoTitles: ['Trainingstage setzen', 'Erste Einheiten planen'],
      linkedHabitTitles: ['Training durchziehen'],
    },
    {
      id: uid('mini'),
      order: 2,
      status: 'upcoming',
      title: 'Essverhalten vereinfachen',
      description:
        'Baue wenige klare Regeln, die deinen Kalorienüberschuss stoppen. Nicht perfekte Ernährung ist das Ziel, sondern kontrollierbare Ernährung.',
      linkedTodoTitles: ['Essensregeln bauen', 'Blocker im Essen erkennen'],
      linkedHabitTitles: ['Eiweißreich essen', 'Essens-Check'],
    },
    {
      id: uid('mini'),
      order: 3,
      status: 'upcoming',
      title: 'Wochenkonstanz sichern',
      description:
        'Der Körper reagiert auf wiederholte Wochen, nicht auf einen motivierten Montag. Training, Essen und Kontrolle müssen zusammenpassen.',
      linkedTodoTitles: ['Wochenkontrolle'],
      linkedHabitTitles: ['Wochencheck'],
    },
    {
      id: uid('mini'),
      order: 4,
      status: 'upcoming',
      title: 'Fortschritt sichtbar machen',
      description:
        `Wenn der Weg passt, wird "${outcome}" realistisch. Das Ganze lohnt sich, weil: ${why || 'du dich besser fühlen und besser aussehen willst'}.`,
      linkedTodoTitles: ['Fortschritt messen'],
      linkedHabitTitles: ['Wochencheck'],
    },
  ];
}

function buildGenericMiniSteps(
  outcome: string,
  why: string,
  currentLevel: string,
  obstacles: string[],
): GoalMiniStep[] {
  return [
    {
      id: uid('mini'),
      order: 1,
      status: 'active',
      title: 'Start vereinfachen',
      description: 'Mach den Einstieg so leicht, dass du ohne Nachdenken loslegen kannst.',
      linkedTodoTitles: ['Ersten Wochenplan festlegen', 'Startaufgabe definieren'],
      linkedHabitTitles: ['Täglich kurz starten'],
    },
    {
      id: uid('mini'),
      order: 2,
      status: 'upcoming',
      title: 'Wiederholbaren Ablauf bauen',
      description: `Baue 2 bis 3 wiederkehrende Schritte, die zu deinem Alltag passen. So vermeidest du ${obstacles.map(mapObstacleLabel).join(', ') || 'unnötige Reibung'}.`,
      linkedTodoTitles: ['Wiederkehrende Schritte festlegen'],
      linkedHabitTitles: ['Feste Routine einhalten'],
    },
    {
      id: uid('mini'),
      order: 3,
      status: 'upcoming',
      title: 'Qualität gezielt verbessern',
      description: `Arbeite bewusst an dem, was dich von "${currentLevel}" in Richtung "${outcome}" bringt.`,
      linkedTodoTitles: ['Schwachstelle gezielt bearbeiten'],
      linkedHabitTitles: ['Kurzer Qualitäts-Check'],
    },
    {
      id: uid('mini'),
      order: 4,
      status: 'upcoming',
      title: 'Ergebnis absichern',
      description: `Prüfe regelmäßig, ob dich dein Verhalten wirklich näher an dein Ziel und dein Warum "${why}" bringt.`,
      linkedTodoTitles: ['Zwischenstand prüfen'],
      linkedHabitTitles: ['Wöchentliche Rückschau'],
    },
  ];
}

function buildHabits(
  category: GoalCategory,
  intensity: GoalIntensityPreset,
  minutesPerDay: number,
  daysPerWeek: number,
): GoalHabitPlan[] {
  const weekdays = pickWeekdays(daysPerWeek);

  if (category === 'fitness') {
    const trainingMinutes =
      intensity === 'gentle' ? 30 :
      intensity === 'balanced' ? 40 :
      intensity === 'ambitious' ? 50 : 60;

    return [
      {
        id: uid('habit'),
        title: 'Training durchziehen',
        shortTitle: 'Training',
        reason: 'Ohne regelmäßige Bewegung entsteht keine sichtbare Veränderung.',
        details: 'Feste Trainingstage durchziehen. Der Rhythmus ist wichtiger als Perfektion.',
        frequencyPerWeek: Math.max(3, Math.min(daysPerWeek, intensity === 'extreme' ? 5 : 4)),
        durationMinutes: Math.min(Math.max(trainingMinutes, 25), Math.max(minutesPerDay, trainingMinutes)),
        difficulty: 'medium',
        cadence: 'selected_days',
        weekdays,
        categoryLabel: 'Training',
      },
      {
        id: uid('habit'),
        title: 'Eiweißreich essen',
        shortTitle: 'Eiweiß',
        reason: 'Sättigung und Muskelerhalt machen Abnehmen deutlich praktikabler.',
        details: 'Bei den Hauptmahlzeiten bewusst auf Eiweiß achten, nicht nur nebenbei.',
        frequencyPerWeek: 7,
        durationMinutes: 0,
        difficulty: 'easy',
        cadence: 'daily',
        categoryLabel: 'Ernährung',
      },
      {
        id: uid('habit'),
        title: 'Essens-Check',
        shortTitle: 'Check',
        reason: 'Ein kurzer Check verhindert, dass ganze Tage unbewusst aus dem Ruder laufen.',
        details: 'Kurz prüfen: War der Tag eher zielnah oder ungeplant?',
        frequencyPerWeek: 7,
        durationMinutes: 5,
        difficulty: 'easy',
        cadence: 'daily',
        categoryLabel: 'Kontrolle',
      },
      {
        id: uid('habit'),
        title: 'Wochencheck',
        shortTitle: 'Review',
        reason: 'Gewichtsverlust entsteht aus Wochenkonstanz, nicht aus einem perfekten Tag.',
        details: 'Einmal pro Woche Gewicht, Einheiten und Essverhalten prüfen.',
        frequencyPerWeek: 1,
        durationMinutes: 15,
        difficulty: 'easy',
        cadence: 'weekly',
        weekdays: [7],
        categoryLabel: 'Review',
      },
    ];
  }

  return [
    {
      id: uid('habit'),
      title: 'Kurz starten',
      shortTitle: 'Start',
      reason: 'Der Einstieg soll klein genug sein, damit du ohne Widerstand anfängst.',
      details: 'Kurzer erster Schritt an deinen festen Tagen.',
      frequencyPerWeek: daysPerWeek,
      durationMinutes: Math.min(10, minutesPerDay),
      difficulty: 'easy',
      cadence: 'selected_days',
      weekdays,
      categoryLabel: 'Start',
    },
    {
      id: uid('habit'),
      title: 'Hauptblock',
      shortTitle: 'Fokus',
      reason: 'Hier entsteht der echte Fortschritt.',
      details: 'Das ist dein zentraler Arbeitsblock für sichtbare Verbesserung.',
      frequencyPerWeek: Math.max(2, Math.min(daysPerWeek, 5)),
      durationMinutes: Math.min(45, Math.max(20, minutesPerDay)),
      difficulty: 'medium',
      cadence: 'selected_days',
      weekdays,
      categoryLabel: 'Kernroutine',
    },
    {
      id: uid('habit'),
      title: 'Wochencheck',
      shortTitle: 'Review',
      reason: 'Damit du nicht nur beschäftigt bist, sondern auf Kurs bleibst.',
      details: 'Kurz prüfen, was gut lief und was konkret angepasst werden muss.',
      frequencyPerWeek: 1,
      durationMinutes: 15,
      difficulty: 'easy',
      cadence: 'weekly',
      weekdays: [7],
      categoryLabel: 'Review',
    },
  ];
}

function buildTodos(
  category: GoalCategory,
  obstacles: string[],
): GoalTodoPlan[] {
  if (category === 'fitness') {
    return [
      {
        id: uid('todo'),
        title: 'Trainingswoche festlegen',
        shortTitle: 'Trainingstage setzen',
        reason: 'Erst feste Termine machen Training realistisch.',
        details: 'Setze konkrete Tage und Uhrzeiten für deine Einheiten.',
        priority: 'high',
        estimatedMinutes: 10,
        categoryLabel: 'Training',
      },
      {
        id: uid('todo'),
        title: '3 Essensregeln festlegen',
        shortTitle: 'Essensregeln bauen',
        reason: 'Klare Regeln sind im Alltag stärker als lose Motivation.',
        details: 'Wähle 3 einfache Regeln, die du wirklich halten kannst.',
        priority: 'high',
        estimatedMinutes: 15,
        categoryLabel: 'Ernährung',
      },
      {
        id: uid('todo'),
        title: 'Größten Essens- oder Rhythmus-Blocker erkennen',
        shortTitle: 'Blocker erkennen',
        reason: `Dein Hauptgegner ist aktuell: ${obstacles.map(mapObstacleLabel).join(', ') || 'fehlende Klarheit'}.`,
        details: 'Finde die eine Sache, die dich am meisten rausbringt.',
        priority: 'medium',
        estimatedMinutes: 10,
        categoryLabel: 'Blocker',
      },
      {
        id: uid('todo'),
        title: 'Wöchentliche Kontrolle einplanen',
        shortTitle: 'Wochenkontrolle',
        reason: 'Ohne ehrliche Rückmeldung merkst du zu spät, ob der Weg funktioniert.',
        details: 'Gewicht, Training und Ernährung 1x pro Woche kurz prüfen.',
        priority: 'medium',
        estimatedMinutes: 10,
        categoryLabel: 'Review',
      },
    ];
  }

  return [
    {
      id: uid('todo'),
      title: 'Ersten Wochenplan festlegen',
      shortTitle: 'Start planen',
      reason: 'Damit das Ziel nicht nur ein Wunsch bleibt.',
      details: 'Lege Tag, Uhrzeit und ersten Schritt fest.',
      priority: 'high',
      estimatedMinutes: 15,
      categoryLabel: 'Start',
    },
    {
      id: uid('todo'),
      title: 'Konkreten Startschritt notieren',
      shortTitle: 'Nächster Hebel',
      reason: 'Damit du weißt, was dich in den nächsten 7 Tagen wirklich voranbringt.',
      details: 'Nur 1 bis 3 Punkte, keine lange Liste.',
      priority: 'high',
      estimatedMinutes: 20,
      categoryLabel: 'Struktur',
    },
    {
      id: uid('todo'),
      title: 'Hindernis entschärfen',
      shortTitle: 'Blocker lösen',
      reason: `Dein häufigstes Hindernis ist aktuell: ${obstacles.map(mapObstacleLabel).join(', ') || 'Unklarheit'}.`,
      details: 'Mach eine kleine Anpassung, die das Dranbleiben leichter macht.',
      priority: 'medium',
      estimatedMinutes: 15,
      categoryLabel: 'Blocker',
    },
    {
      id: uid('todo'),
      title: 'Zwischenstand nach 7 Tagen prüfen',
      shortTitle: '7-Tage-Check',
      reason: 'Damit du früh merkst, ob der Plan realistisch ist.',
      details: 'Prüfe ehrlich: Was hat funktioniert? Was war zu viel? Was bleibt?',
      priority: 'medium',
      estimatedMinutes: 15,
      categoryLabel: 'Review',
    },
  ];
}

function buildCalendarBlocks(
  category: GoalCategory,
  daysPerWeek: number,
  minutesPerDay: number,
  bestTime: GoalConstraintProfile['preferredTime'],
): GoalCalendarBlockPlan[] {
  const startTime =
    bestTime === 'morning'
      ? '07:30'
      : bestTime === 'afternoon'
        ? '16:00'
        : bestTime === 'evening'
          ? '19:00'
          : '18:00';

  if (category === 'fitness') {
    return [
      {
        id: uid('cal'),
        title: 'Training',
        shortTitle: 'Training',
        reason: 'Der Trainingsblock ist fest reserviert und nicht nur lose geplant.',
        dayLabel: `${daysPerWeek}x pro Woche`,
        startTime,
        durationMinutes: Math.max(30, Math.min(minutesPerDay, 60)),
        categoryLabel: 'Training',
        details: 'Hier findet die eigentliche körperliche Arbeit statt.',
      },
      {
        id: uid('cal'),
        title: 'Wochencheck',
        shortTitle: 'Check',
        reason: 'Ein fixer Review-Termin hält den Plan ehrlich.',
        dayLabel: '1x pro Woche',
        startTime: '20:00',
        durationMinutes: 15,
        categoryLabel: 'Review',
        details: 'Gewicht, Training und Essverhalten prüfen.',
      },
    ];
  }

  return [
    {
      id: uid('cal'),
      title: 'Fokusblock',
      shortTitle: 'Fokus',
      reason: 'Ein fester Block senkt Reibung und macht den Start wahrscheinlicher.',
      dayLabel: `${daysPerWeek}x pro Woche`,
      startTime,
      durationMinutes: Math.max(20, Math.min(minutesPerDay, 60)),
      categoryLabel: 'Kernblock',
      details: 'Das ist dein wichtigster festeingeplanter Fortschrittsblock.',
    },
  ];
}

function buildRecommendation(
  category: GoalCategory,
  outcome: string,
  why: string,
  obstacles: string[],
): GoalPlanRecommendation {
  if (category === 'fitness') {
    return {
      summary:
        `Um "${outcome}" zu erreichen, löst du vier Dinge praktisch: ` +
        `Du baust feste Trainingstage ein, vereinfachst dein Essen mit wenigen klaren Regeln, ` +
        `hältst deine Woche im Schnitt im Kaloriendefizit und prüfst 1x pro Woche ehrlich deinen Fortschritt. ` +
        `Der Weg ist also nicht "erst mal motivierter werden", sondern ein konkreter Trainings- und Ernährungsrahmen, der im Alltag funktioniert.`,
      todayFocus:
        'Setze heute konkrete Trainingstage und lege 3 Essensregeln fest, die du wirklich halten kannst.',
      nextStep:
        'Zieh die Woche sauber durch und prüfe danach: Training erledigt, Ernährung kontrollierter, Fortschritt sichtbar?',
      warnings: [
        obstacles.includes('overwhelm')
          ? 'Starte nicht zu hart. Konstanz schlägt Übermotivation.'
          : 'Ein einzelner perfekter Tag bringt wenig. Entscheidend ist deine Wochenkonstanz.',
      ],
    };
  }

  return {
    summary:
      `Dein Ziel wird über einen klaren Rhythmus erreicht. ` +
      `Der Plan fokussiert sich darauf, dass du regelmäßig sichtbar an "${outcome}" arbeitest, ohne dich zu überfordern.`,
    todayFocus: 'Lege heute deinen ersten festen Block fest und starte mit einer klaren Aufgabe.',
    nextStep: 'Zieh den Plan 7 Tage ehrlich durch und passe erst dann Details an.',
    warnings: [
      `Dein Hauptgegner ist aktuell ${obstacles.map(mapObstacleLabel).join(', ') || 'Unklarheit'}. Der Plan hält die Schritte deshalb bewusst klar.`,
    ],
  };
}

function buildRequirements(
  daysPerWeek: number,
  minutesPerDay: number,
  targetDateIso: string,
  startDateIso: string,
): GoalPlanRequirements {
  const estimatedWeeksNeeded = Math.max(2, Math.ceil(daysBetween(startDateIso, targetDateIso) / 7));
  const requiredMinutesPerWeek = daysPerWeek * minutesPerDay;

  return {
    requiredHabitsPerWeek: Math.max(2, Math.min(5, daysPerWeek)),
    requiredTodosPerWeek: 3,
    requiredFocusBlocksPerWeek: Math.max(2, Math.min(5, daysPerWeek)),
    requiredMinutesPerWeek,
    estimatedWeeksNeeded,
    onTrackThreshold: 70,
  };
}

function buildDiagnostic(
  currentLevel: string,
  outcome: string,
  why: string,
  obstacles: string[],
  weeks: number,
  minutesPerWeek: number,
): GoalDiagnostic {
  const estimatedDifficulty = toDifficulty(weeks, minutesPerWeek);
  const realismBase = Math.max(45, 100 - weeks * 2);
  const confidenceBase = Math.max(40, 85 - obstacles.length * 8);

  return {
    summary: `Von "${currentLevel || 'Anfang'}" in Richtung "${outcome}" mit einem klaren Wochenrhythmus.`,
    currentLevelLabel: currentLevel || 'Startpunkt noch unklar',
    targetLevelLabel: outcome,
    strengths: [
      why ? 'Klares persönliches Warum vorhanden' : 'Grundmotivation vorhanden',
      'Ziel wurde konkretisiert',
    ],
    blockers: obstacles.map(mapObstacleLabel),
    risks: obstacles.includes('overwhelm')
      ? ['Zu harter Einstieg']
      : obstacles.includes('discipline')
        ? ['Rhythmus könnte abbrechen']
        : ['Umsetzung könnte zu unklar bleiben'],
    realismScore: Math.max(40, Math.min(95, realismBase)),
    confidenceScore: Math.max(35, Math.min(90, confidenceBase)),
    estimatedWeeks: weeks,
    estimatedDifficulty,
    difficulty: estimatedDifficulty,
    whyThisGoalMatters: why,
  };
}

function buildReviewPrompts(): GoalReviewPrompt[] {
  return [
    { id: uid('review'), question: 'Was hat diese Woche wirklich funktioniert?' },
    { id: uid('review'), question: 'Was hat mich konkret rausgebracht?' },
    { id: uid('review'), question: 'Welche eine Anpassung macht nächste Woche stärker?' },
  ];
}

function buildExecutionPlan(
  category: GoalCategory,
  intensityPreset: GoalIntensityPreset,
  minutesPerDay: number,
  daysPerWeek: number,
  bestTime: GoalConstraintProfile['preferredTime'],
  obstacles: string[],
): GoalExecutionPlan {
  return {
    summary: `Praktischer Umsetzungsplan für ${category === 'fitness' ? 'dein Fitnessziel' : 'dein Ziel'} mit festen Routinen und klaren Startschritten.`,
    intensityPreset,
    habits: buildHabits(category, intensityPreset, minutesPerDay, daysPerWeek),
    todos: buildTodos(category, obstacles),
    calendarBlocks: buildCalendarBlocks(category, daysPerWeek, minutesPerDay, bestTime),
  };
}

export function validateQuestionnaire(
  questions: GoalQuestion[],
  answers: GoalAnswerMap,
): { valid: boolean; missingIds: string[] } {
  const missingIds = questions
    .filter((question) => {
      if (!question.required) return false;
      const value = answers[question.id];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'number') return false;
      return !String(value ?? '').trim();
    })
    .map((question) => question.id);

  return { valid: missingIds.length === 0, missingIds };
}

export function buildGoalFromAnswers({
  title,
  category,
  answers,
  profile,
}: BuildArgs): PsycheGoal {
  const now = nowIso();

  const outcome = asString(answers.outcome, title);
  const why = asString(answers.why);
  const currentLevel = asString(answers.current_level, 'Anfang');
  const deadlineRaw = asString(answers.deadline);
  const targetDate = resolveTargetDate(deadlineRaw, title, outcome);

  const rawDaysPerWeek = asNumber(answers.days_per_week, 4);
  const rawMinutesPerDay = asNumber(answers.minutes_per_day, profile?.preferredSessionMinutes ?? 30);

  const daysPerWeek = Math.max(2, Math.min(7, rawDaysPerWeek));
  const minutesPerDay = Math.max(10, Math.min(180, rawMinutesPerDay));

  const bestTime = (asString(answers.best_time, profile?.energyWindow ?? 'mixed') ||
    'mixed') as GoalConstraintProfile['preferredTime'];
  const obstacles = asMulti(answers.obstacles);
  const planStyle = asString(answers.plan_style, profile?.planningStyle ?? 'structured');
  const intensityPreset = detectIntensity(planStyle);

  const constraints: GoalConstraintProfile = {
    availableDaysPerWeek: daysPerWeek,
    minutesPerDay,
    preferredTime: bestTime,
    intensity: clampIntensity(
      intensityPreset === 'gentle'
        ? 2
        : intensityPreset === 'balanced'
          ? 3
          : intensityPreset === 'ambitious'
            ? 4
            : 5,
    ),
    learningSpeed: mapLearningSpeed(profile),
    stressTolerance: mapStressTolerance(obstacles),
  };

  const safeDaysPerWeek = constraints.availableDaysPerWeek ?? daysPerWeek;
  const safeMinutesPerDay = constraints.minutesPerDay ?? minutesPerDay;

  const requirements = buildRequirements(
    safeDaysPerWeek,
    safeMinutesPerDay,
    targetDate,
    now,
  );

  const safeEstimatedWeeksNeeded = requirements.estimatedWeeksNeeded ?? 8;
  const safeRequiredMinutesPerWeek = requirements.requiredMinutesPerWeek ?? (safeDaysPerWeek * safeMinutesPerDay);

  const diagnostic = buildDiagnostic(
    currentLevel,
    outcome,
    why,
    obstacles,
    safeEstimatedWeeksNeeded,
    safeRequiredMinutesPerWeek,
  );

  const executionPlan = buildExecutionPlan(
    category,
    intensityPreset,
    safeMinutesPerDay,
    safeDaysPerWeek,
    constraints.preferredTime,
    obstacles,
  );

  const habits = (executionPlan.habits ?? []).filter((habit) => {
    const habitDuration = habit.durationMinutes ?? 0;
    if (category === 'fitness' && habit.shortTitle === 'Eiweiß' && habitDuration > 10) {
      return false;
    }
    return true;
  });

  executionPlan.habits = habits;

  const miniSteps =
    category === 'fitness'
      ? buildFitnessMiniSteps(outcome, why)
      : buildGenericMiniSteps(outcome, why, currentLevel, obstacles);

  const recommendation = buildRecommendation(category, outcome, why, obstacles);
  const reviewPrompts = buildReviewPrompts();

  return {
    id: uid('goal'),
    title: title.trim(),
    category,
    difficultyLevel:
      intensityPreset === 'gentle'
        ? 3
        : intensityPreset === 'balanced'
          ? 5
          : intensityPreset === 'ambitious'
            ? 7
            : 9,
    targetDate,
    createdAt: now,
    why,
    answers,
    recommendation,
    miniSteps,
    executionPlan,
    progressPercent: 0,

    status: 'active',
    startDate: now,
    targetOutcome: outcome,
    notes: asString(answers.success_picture) || asString(answers.past_problem) || '',
    userReportedProgress: 0,
    metrics: buildMetrics(category),
    milestones: buildMilestones(category, outcome),
    constraints,
    diagnostic,
    requirements,
    intensityPreset,
    currentSituation: currentLevel,
    successVision: asString(answers.success_picture, outcome),
    mainObstacle: obstacles.map(mapObstacleLabel).join(', '),
    availableDaysLabel: `${safeDaysPerWeek} Tage pro Woche`,
    preferredPlanStyle:
      planStyle === 'small_steps' || planStyle === 'flexible' || planStyle === 'push'
        ? planStyle
        : 'structured',
    reviewPrompts,
    lastGeneratedFromAnswers: answers,
    availableDaysPerWeek: safeDaysPerWeek,
    appliedToApp: false,
  };
}
