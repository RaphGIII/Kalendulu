import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarEventLike,
  HabitsStateLike,
  PsycheSuggestedCalendarBlock,
  PsycheSuggestedHabit,
  PsycheSuggestedTodo,
  TodoLikeTask,
  TodoStateLike,
} from './types';
import { STORAGE_KEYS } from '../shared/storageKeys';
const HABITS_KEY = STORAGE_KEYS.HABITS;
const TODO_KEY_GUESS_1 = STORAGE_KEYS.TODO;
const TODO_KEY_GUESS_2 = STORAGE_KEYS.TODO;

const CAL_KEY_GUESS_1 = STORAGE_KEYS.CALENDAR_EVENTS;
const CAL_KEY_GUESS_2 = STORAGE_KEYS.CALENDAR_EVENTS;

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadHabitsState(): Promise<HabitsStateLike | null> {
  return getJson(HABITS_KEY);
}

export async function loadTodoStateBestEffort(): Promise<TodoStateLike | null> {
  return (await getJson<TodoStateLike>(TODO_KEY_GUESS_1)) ??
    (await getJson<TodoStateLike>(TODO_KEY_GUESS_2));
}

export async function loadCalendarEventsBestEffort(): Promise<CalendarEventLike[] | null> {
  const arr1 = await getJson<CalendarEventLike[]>(CAL_KEY_GUESS_1);
  if (arr1) return arr1;

  const arr2 = await getJson<CalendarEventLike[]>(CAL_KEY_GUESS_2);
  if (arr2) return arr2;

  const wrapped = await getJson<{ events: CalendarEventLike[] }>(CAL_KEY_GUESS_1);
  if (wrapped?.events) return wrapped.events;

  return null;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function sameMinute(a: string | Date, b: string | Date) {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(da - db) < 60_000;
}

function createTodoTaskFromSuggestion(item: PsycheSuggestedTodo): TodoLikeTask {
  return {
    id: item.id,
    title: item.title,
    categoryId: 'business',
    done: false,
    createdAt: Date.now(),
    reminderEnabled: false,
    reminderId: null,
  };
}

export async function applyTodoSuggestions(items: PsycheSuggestedTodo[]) {
  if (!items.length) return { added: 0 };

  const current =
    (await loadTodoStateBestEffort()) ?? {
      name: 'Kalendulu Todo',
      tasks: [],
    };

  const existingTitles = new Set(current.tasks.map((t) => normalize(t.title)));

  const additions = items
    .filter((item) => !existingTitles.has(normalize(item.title)))
    .map(createTodoTaskFromSuggestion);

  const next: TodoStateLike = {
    ...current,
    tasks: [...current.tasks, ...additions],
  };

  const targetKey = (await getJson(TODO_KEY_GUESS_1)) ? TODO_KEY_GUESS_1 : TODO_KEY_GUESS_2;
  await setJson(targetKey, next);

  return { added: additions.length };
}

export async function applyHabitSuggestions(items: PsycheSuggestedHabit[]) {
  if (!items.length) return { added: 0 };

  const current =
    (await loadHabitsState()) ?? {
      name: 'Kalendulu Habits',
      habits: [],
    };

  const existingTitles = new Set(current.habits.map((h) => normalize(h.title)));

  const additions = items
    .filter((item) => !existingTitles.has(normalize(item.title)))
    .map((item) => ({
      id: item.id,
      title: item.title,
      color: '#D4AF37',
      targetPerDay: Math.max(1, item.frequencyPerDay),
      checkins: {},
    }));

  const next: HabitsStateLike = {
    ...current,
    habits: [...current.habits, ...additions],
  };

  await setJson(HABITS_KEY, next);

  return { added: additions.length };
}

export async function applyCalendarSuggestions(items: PsycheSuggestedCalendarBlock[]) {
  if (!items.length) return { added: 0 };

  const current = (await loadCalendarEventsBestEffort()) ?? [];

  const additions = items.filter((item) => {
    return !current.some(
      (event) =>
        normalize(event.title) === normalize(item.title) &&
        sameMinute(event.start, item.start) &&
        sameMinute(event.end, item.end)
    );
  });

  const next: CalendarEventLike[] = [
    ...current,
    ...additions.map((item) => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end,
    })),
  ];

  await setJson(STORAGE_KEYS.CALENDAR_EVENTS, next);

  return { added: additions.length };
}

export async function applyFullGoalPlan(params: {
  todos: PsycheSuggestedTodo[];
  habits: PsycheSuggestedHabit[];
  calendarBlocks: PsycheSuggestedCalendarBlock[];
}) {
  const [todoResult, habitResult, calendarResult] = await Promise.all([
    applyTodoSuggestions(params.todos),
    applyHabitSuggestions(params.habits),
    applyCalendarSuggestions(params.calendarBlocks),
  ]);

  return {
    todosAdded: todoResult.added,
    habitsAdded: habitResult.added,
    calendarAdded: calendarResult.added,
  };
}