import {
  CalendarEventLike,
  GoalDifficulty,
  GoalHorizon,
  PsycheFreeSlot,
  PsycheGoal,
  PsycheGoalPlan,
  PsycheSuggestedCalendarBlock,
  PsycheSuggestedHabit,
  PsycheSuggestedTodo,
  TodoLikeTask,
} from '../types';
import { semanticMatchGoal } from './semanticMatcher';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function containsAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((word) => t.includes(word));
}

export function detectGoalDifficulty(title: string, horizon: GoalHorizon): GoalDifficulty {
  const text = title.toLowerCase();
  let score = 0;

  if (
    containsAny(text, [
      'mondscheinsonate',
      'perfekt',
      'fließend',
      'top-noten',
      'marathon',
      'unternehmen',
      'meister',
    ])
  ) {
    score += 2;
  }

  if (
    containsAny(text, [
      'lernen',
      'besser werden',
      'fit werden',
      'aufbauen',
      'regelmäßig',
      'disziplin',
      'routine',
    ])
  ) {
    score += 1;
  }

  if (horizon === 'week') score += 1;
  if (horizon === 'month') score += 1;
  if (horizon === 'fiveYears') score -= 1;

  if (score >= 3) return 'hard';
  if (score >= 1) return 'medium';
  return 'easy';
}

export function createGoal(input: { title: string; horizon: GoalHorizon }): PsycheGoal {
  const semantic = semanticMatchGoal(input.title);

  return {
    id: uid('goal'),
    title: input.title.trim(),
    horizon: input.horizon,
    category: semantic.category,
    difficulty: detectGoalDifficulty(input.title, input.horizon),
    createdAt: Date.now(),
    active: true,
    semantic: semantic.match,
  };
}

export function getFreeSlotsForDay(
  calendarEvents: CalendarEventLike[],
  dayStart: Date,
  dayEnd: Date,
  minMinutes = 20
): PsycheFreeSlot[] {
  const normalized = [...calendarEvents]
    .map((event) => ({
      ...event,
      startDate: toDate(event.start),
      endDate: toDate(event.end),
    }))
    .filter((event) => event.endDate > dayStart && event.startDate < dayEnd)
    .sort((a, b) => +a.startDate - +b.startDate);

  const slots: PsycheFreeSlot[] = [];
  let cursor = new Date(dayStart);

  for (const event of normalized) {
    if (event.startDate > cursor) {
      const minutes = Math.round((+event.startDate - +cursor) / 60000);
      if (minutes >= minMinutes) {
        slots.push({
          start: cursor.toISOString(),
          end: event.startDate.toISOString(),
          minutes,
        });
      }
    }

    if (event.endDate > cursor) {
      cursor = new Date(event.endDate);
    }
  }

  if (dayEnd > cursor) {
    const minutes = Math.round((+dayEnd - +cursor) / 60000);
    if (minutes >= minMinutes) {
      slots.push({
        start: cursor.toISOString(),
        end: dayEnd.toISOString(),
        minutes,
      });
    }
  }

  return slots;
}

function extractPracticeLabel(goal: PsycheGoal) {
  const title = goal.title.toLowerCase();

  if (title.includes('mondscheinsonate')) return 'Mondscheinsonate';
  if (title.includes('klavier') || goal.semantic?.matchedConcepts.includes('piano')) return 'Klavier';
  if (title.includes('gitarre') || goal.semantic?.matchedConcepts.includes('guitar')) return 'Gitarre';
  if (title.includes('mathe')) return 'Mathe';
  if (title.includes('englisch')) return 'Englisch';

  return goal.title;
}

function buildSuggestedTodos(goal: PsycheGoal, tasks: TodoLikeTask[]): PsycheSuggestedTodo[] {
  const openTitles = new Set(tasks.filter((t) => !t.done).map((t) => t.title.toLowerCase()));
  const out: PsycheSuggestedTodo[] = [];

  const pushIfMissing = (title: string, priority: 'low' | 'medium' | 'high', reason: string) => {
    if (openTitles.has(title.toLowerCase())) return;
    out.push({
      id: uid('todo'),
      title,
      priority,
      reason,
      goalId: goal.id,
    });
  };

  switch (goal.category) {
    case 'skill':
      pushIfMissing(
        `${extractPracticeLabel(goal)} in Teilziele zerlegen`,
        'high',
        'Komplexe Fähigkeiten werden leichter, wenn du sie in kleine Etappen aufteilst.'
      );
      pushIfMissing(
        `${extractPracticeLabel(goal)}: erste fokussierte Übungseinheit vorbereiten`,
        'medium',
        'Ein definierter Start senkt Reibung und erhöht die Chance auf Umsetzung.'
      );
      break;

    case 'study':
      pushIfMissing(
        `${goal.title}: Wochenlernplan erstellen`,
        'high',
        'Lernziele werden stärker, wenn sie in eine klare Wochenstruktur übersetzt werden.'
      );
      pushIfMissing(
        `${goal.title}: ein Schwerpunkt-Thema festlegen`,
        'medium',
        'Fokus ist meist wertvoller als vages Vielmachen.'
      );
      break;

    case 'fitness':
      pushIfMissing(
        `${goal.title}: Trainingsblock für diese Woche festlegen`,
        'high',
        'Fitness entsteht durch feste Einplanung, nicht durch Hoffnung auf Motivation.'
      );
      break;

    case 'career':
      pushIfMissing(
        `${goal.title}: nächsten Karriereschritt definieren`,
        'high',
        'Karriereziele werden real, wenn sie in konkrete Aktionen übersetzt werden.'
      );
      break;

    default:
      pushIfMissing(
        `${goal.title}: ersten konkreten Schritt definieren`,
        'high',
        'Jedes Ziel braucht eine sofort umsetzbare nächste Aktion.'
      );
  }

  return out.slice(0, 2);
}

function buildSuggestedHabits(goal: PsycheGoal): PsycheSuggestedHabit[] {
  const frequencyPerDay =
    goal.difficulty === 'hard' ? 2 : goal.difficulty === 'medium' ? 1 : 1;

  switch (goal.category) {
    case 'skill':
      return [
        {
          id: uid('habit'),
          title: `${extractPracticeLabel(goal)} üben`,
          frequencyPerDay,
          reason: 'Skill-Ziele profitieren stark von häufiger Wiederholung in kurzen Sessions.',
          goalId: goal.id,
        },
      ];

    case 'study':
      return [
        {
          id: uid('habit'),
          title: 'Lernblock durchführen',
          frequencyPerDay,
          reason: 'Konstanz schlägt spontane Motivation.',
          goalId: goal.id,
        },
      ];

    case 'fitness':
      return [
        {
          id: uid('habit'),
          title: 'Training / Bewegung',
          frequencyPerDay: 1,
          reason: 'Fitness wird durch Rhythmus aufgebaut.',
          goalId: goal.id,
        },
      ];

    default:
      return [
        {
          id: uid('habit'),
          title: `${goal.title} – täglicher Mini-Schritt`,
          frequencyPerDay: 1,
          reason: 'Ein kleiner täglicher Schritt hält das Ziel lebendig.',
          goalId: goal.id,
        },
      ];
  }
}

function buildSuggestedCalendarBlocks(
  goal: PsycheGoal,
  freeSlots: PsycheFreeSlot[]
): PsycheSuggestedCalendarBlock[] {
  if (!freeSlots.length) return [];

  const preferredMinutes =
    goal.difficulty === 'hard' ? 45 : goal.difficulty === 'medium' ? 30 : 20;

  const bestSlot =
    freeSlots.find((slot) => slot.minutes >= preferredMinutes) ??
    freeSlots.find((slot) => slot.minutes >= 20);

  if (!bestSlot) return [];

  const start = new Date(bestSlot.start);
  const actualMinutes = Math.min(preferredMinutes, bestSlot.minutes);
  const end = new Date(start.getTime() + actualMinutes * 60000);

  let title = `${goal.title} Fortschritt`;
  if (goal.category === 'skill') title = `${extractPracticeLabel(goal)} üben`;
  if (goal.category === 'study') title = `${goal.title} Lernblock`;
  if (goal.category === 'fitness') title = `${goal.title} Training`;

  return [
    {
      id: uid('cal'),
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      reason: 'Dieser freie Zeitslot eignet sich für einen konkreten Fortschrittsschritt.',
      goalId: goal.id,
    },
  ];
}

function buildMotivation(goal: PsycheGoal, freeSlots: PsycheFreeSlot[]) {
  if (goal.category === 'skill' && goal.difficulty === 'hard') {
    return `Große Fähigkeiten entstehen nicht aus Talent allein. ${extractPracticeLabel(goal)} wird durch Wiederholung real.`;
  }

  if (goal.category === 'study') {
    return `Dein Ziel braucht keinen perfekten Tag. Es braucht Fokus, Wiederholung und einen klaren nächsten Schritt.`;
  }

  if (goal.category === 'fitness') {
    return `Dein Körper folgt dem, was du regelmäßig tust. Nicht Motivation entscheidet, sondern Rhythmus.`;
  }

  if (freeSlots.length > 0) {
    return `Dein Kalender zeigt Spielraum. Jetzt zählt, ob du ihn in echten Fortschritt verwandelst.`;
  }

  return `Dein Ziel wird glaubwürdig, wenn dein Verhalten heute dazu passt.`;
}

function buildSummary(goal: PsycheGoal, freeSlots: PsycheFreeSlot[]) {
  const slotInfo =
    freeSlots.length > 0
      ? `Es wurde mindestens ein freier Zeitslot erkannt.`
      : `Heute wurde kein klarer freier Zeitslot erkannt.`;

  const semanticInfo =
    goal.semantic && goal.semantic.matchedConcepts.length > 0
      ? `Erkannte Konzepte: ${goal.semantic.matchedConcepts.join(', ')}.`
      : `Keine starken semantischen Treffer, daher allgemeine Planung.`;

  return `${goal.title} wurde als ${goal.category}-Ziel mit ${goal.difficulty}er Schwierigkeit bewertet. ${slotInfo} ${semanticInfo}`;
}

export function buildGoalPlan(params: {
  goal: PsycheGoal;
  tasks: TodoLikeTask[];
  calendarEvents: CalendarEventLike[];
  dayStart: Date;
  dayEnd: Date;
}): PsycheGoalPlan {
  const freeSlots = getFreeSlotsForDay(params.calendarEvents, params.dayStart, params.dayEnd, 20);

  return {
    goal: params.goal,
    motivation: buildMotivation(params.goal, freeSlots),
    summary: buildSummary(params.goal, freeSlots),
    todos: buildSuggestedTodos(params.goal, params.tasks),
    habits: buildSuggestedHabits(params.goal),
    calendarBlocks: buildSuggestedCalendarBlocks(params.goal, freeSlots),
  };
}