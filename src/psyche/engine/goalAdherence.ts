import dayjs from 'dayjs';
import type {
  CalendarEventLike,
  GoalLinkEntry,
  GoalLinkMap,
  HabitLike,
  PsycheGoal,
  TodoTaskLike,
} from '../types';

export type GoalAdherenceResult = {
  habitAdherence: number;
  todoAdherence: number;
  calendarAdherence: number;
  overallAdherence: number;
  signals: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function getLinkedEntry(goal: PsycheGoal, goalLinks?: GoalLinkMap | null): GoalLinkEntry | null {
  if (!goalLinks) return null;
  return goalLinks[goal.id] ?? null;
}

function getRecentDateKeys(days = 7) {
  return Array.from({ length: days }, (_, i) =>
    dayjs().subtract(i, 'day').format('YYYY-MM-DD')
  );
}

function computeHabitAdherence(
  goal: PsycheGoal,
  habits: HabitLike[],
  linked: GoalLinkEntry | null
) {
  const keys = getRecentDateKeys(7);

  const relevantHabits = habits.filter((habit) => {
    if (linked?.habitIds.includes(habit.id)) return true;
    if (linked?.habitTitles.some((title) => normalize(title) === normalize(habit.title))) return true;
    return false;
  });

  if (relevantHabits.length === 0) return 0;

  const performed = relevantHabits.reduce((sum, habit) => {
    return (
      sum +
      keys.reduce((dateSum, dateKey) => dateSum + Number(habit.checkins?.[dateKey] ?? 0), 0)
    );
  }, 0);

  const required = Math.max(1, goal.requirements.requiredHabitsPerWeek);
  return clamp((performed / required) * 100);
}

function computeTodoAdherence(
  goal: PsycheGoal,
  tasks: TodoTaskLike[],
  linked: GoalLinkEntry | null
) {
  const relevantTasks = tasks.filter((task) => {
    if (linked?.todoIds.includes(task.id)) return true;
    if (linked?.todoTitles.some((title) => normalize(title) === normalize(task.title))) return true;
    return false;
  });

  if (relevantTasks.length === 0) return 0;

  const done = relevantTasks.filter((task) => task.done).length;
  const required = Math.max(1, goal.requirements.requiredTodosPerWeek);

  return clamp((done / required) * 100);
}

function computeCalendarAdherence(
  goal: PsycheGoal,
  calendarEvents: CalendarEventLike[],
  linked: GoalLinkEntry | null
) {
  const relevantEvents = calendarEvents.filter((event) => {
    const eventId = typeof event.id === 'string' ? event.id : '';
    if (linked?.calendarIds.includes(eventId)) return true;
    if (
      linked?.calendarTitles.some((title) => normalize(title) === normalize(event.title))
    ) {
      return true;
    }
    return false;
  });

  if (relevantEvents.length === 0) return 0;

  const required = Math.max(1, goal.requirements.requiredFocusBlocksPerWeek);
  return clamp((relevantEvents.length / required) * 100);
}

export function computeGoalAdherence(params: {
  goal: PsycheGoal;
  habits?: HabitLike[] | null;
  tasks?: TodoTaskLike[] | null;
  calendarEvents?: CalendarEventLike[] | null;
  goalLinks?: GoalLinkMap | null;
}): GoalAdherenceResult {
  const { goal } = params;
  const habits = params.habits ?? [];
  const tasks = params.tasks ?? [];
  const calendarEvents = params.calendarEvents ?? [];
  const linked = getLinkedEntry(goal, params.goalLinks);

  const habitAdherence = Math.round(computeHabitAdherence(goal, habits, linked));
  const todoAdherence = Math.round(computeTodoAdherence(goal, tasks, linked));
  const calendarAdherence = Math.round(computeCalendarAdherence(goal, calendarEvents, linked));

  const overallAdherence = Math.round(
    habitAdherence * 0.45 + todoAdherence * 0.35 + calendarAdherence * 0.20
  );

  const signals: string[] = [];
  if (habitAdherence < 45) signals.push('Habits werden aktuell zu selten eingehalten');
  if (todoAdherence < 45) signals.push('Zu wenige geplante Todos werden abgeschlossen');
  if (calendarAdherence < 45) signals.push('Zu wenige Fokusblöcke werden real abgesichert');
  if (overallAdherence >= 75) signals.push('Der Plan wird insgesamt solide getragen');

  return {
    habitAdherence,
    todoAdherence,
    calendarAdherence,
    overallAdherence,
    signals,
  };
}