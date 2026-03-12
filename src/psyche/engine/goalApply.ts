import dayjs from 'dayjs';
import type {
  GoalCalendarBlockPlan,
  GoalExecutionPlan,
  GoalLinkEntry,
  PsycheGoal,
  PsycheSuggestedCalendarBlock,
  PsycheSuggestedHabit,
  PsycheSuggestedTodo,
} from '../types';
import { applyFullGoalPlan } from '../adapters';
import { saveGoalLinkEntry } from '../goalLinks';
import { buildExecutionPlan } from './goalExecutionPlan';

const DAY_INDEX: Record<string, number> = {
  sonntag: 0,
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
};

function nextDateForDayLabel(dayLabel: string) {
  const normalized = dayLabel.trim().toLowerCase();
  const target = DAY_INDEX[normalized];
  const now = dayjs();

  if (typeof target !== 'number') {
    return now.add(1, 'day');
  }

  const current = now.day();
  let diff = target - current;
  if (diff <= 0) diff += 7;

  return now.add(diff, 'day');
}

function toCalendarSuggestion(
  goal: PsycheGoal,
  item: GoalCalendarBlockPlan,
  index: number
): PsycheSuggestedCalendarBlock {
  const date = nextDateForDayLabel(item.dayLabel);
  const [hour, minute] = item.startTime.split(':').map((x) => Number(x));
  const start = date.hour(hour || 8).minute(minute || 0).second(0).millisecond(0);
  const end = start.add(item.durationMinutes, 'minute');

  return {
    id: `${goal.id}-calendar-${index}`,
    title: `${goal.title} · ${item.title}`,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toTodoSuggestions(goal: PsycheGoal, plan: GoalExecutionPlan): PsycheSuggestedTodo[] {
  return plan.todos.map((item, index) => ({
    id: `${goal.id}-todo-${index}`,
    title: `${goal.title} · ${item.title}`,
  }));
}

function toHabitSuggestions(goal: PsycheGoal, plan: GoalExecutionPlan): PsycheSuggestedHabit[] {
  return plan.habits.map((item, index) => ({
    id: `${goal.id}-habit-${index}`,
    title: `${goal.title} · ${item.title}`,
    frequencyPerDay: 1,
  }));
}

function toCalendarSuggestions(
  goal: PsycheGoal,
  plan: GoalExecutionPlan
): PsycheSuggestedCalendarBlock[] {
  return plan.calendarBlocks.map((item, index) => toCalendarSuggestion(goal, item, index));
}

export async function applyGoalExecutionPlan(goal: PsycheGoal) {
  const plan = goal.executionPlan ?? buildExecutionPlan(goal);

  const todos = toTodoSuggestions(goal, plan);
  const habits = toHabitSuggestions(goal, plan);
  const calendarBlocks = toCalendarSuggestions(goal, plan);

  const result = await applyFullGoalPlan({
    todos,
    habits,
    calendarBlocks,
  });

  const entry: GoalLinkEntry = {
    goalId: goal.id,
    todoIds: todos.map((x) => x.id),
    habitIds: habits.map((x) => x.id),
    calendarIds: calendarBlocks.map((x) => x.id),
    todoTitles: todos.map((x) => x.title),
    habitTitles: habits.map((x) => x.title),
    calendarTitles: calendarBlocks.map((x) => x.title),
    updatedAt: new Date().toISOString(),
  };

  await saveGoalLinkEntry(entry);

  return result;
}