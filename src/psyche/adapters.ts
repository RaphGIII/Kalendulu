import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEventLike, HabitsStateLike, TodoStateLike } from './types';

const HABITS_KEY = 'kalendulu:habits:v1';

// Falls du To-Do/Kalender später speicherst: diese Keys ggf. anpassen
const TODO_KEY_GUESS_1 = 'kalendulu:todo:v1';
const TODO_KEY_GUESS_2 = 'kalendulu:todo:state:v1';

const CAL_KEY_GUESS_1 = 'kalendulu:calendar:events:v1';
const CAL_KEY_GUESS_2 = 'kalendulu:events:v1';

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadHabitsState(): Promise<HabitsStateLike | null> {
  return getJson<HabitsStateLike>(HABITS_KEY);
}

export async function loadTodoStateBestEffort(): Promise<TodoStateLike | null> {
  return (await getJson<TodoStateLike>(TODO_KEY_GUESS_1)) ?? (await getJson<TodoStateLike>(TODO_KEY_GUESS_2));
}

export async function loadCalendarEventsBestEffort(): Promise<CalendarEventLike[] | null> {
  // Either stored directly as array or wrapped in object
  const arr1 = await getJson<CalendarEventLike[]>(CAL_KEY_GUESS_1);
  if (arr1) return arr1;

  const arr2 = await getJson<CalendarEventLike[]>(CAL_KEY_GUESS_2);
  if (arr2) return arr2;

  const wrapped = await getJson<{ events: CalendarEventLike[] }>(CAL_KEY_GUESS_1);
  if (wrapped?.events) return wrapped.events;

  return null;
}