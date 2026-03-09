import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';

import { loadHabitsState, saveHabitsState } from '../habits/storage';
import { STORAGE_KEYS } from '../shared/storageKeys';

const TODO_STORAGE_KEY = 'kalendulu:todo:v1';

type TodoCategory = {
  id: string;
  name: string;
  color: string;
};

type TodoTask = {
  id: string;
  title: string;
  categoryId: string;
  done: boolean;
  createdAt: number;
  reminderEnabled: boolean;
  reminderId: string | null;
};

type TodoState = {
  name: string;
  categories: TodoCategory[];
  tasks: TodoTask[];
};

type CalendarEventLike = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  color: string;
  location?: string;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

const DEFAULT_TODO_STATE: TodoState = {
  name: 'Raphael',
  categories: [
    { id: 'business', name: 'Business', color: '#D4AF37' },
    { id: 'personal', name: 'Personal', color: '#C0C0C0' },
  ],
  tasks: [],
};

async function loadTodoState(): Promise<TodoState> {
  try {
    const raw = await AsyncStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return DEFAULT_TODO_STATE;

    const parsed = JSON.parse(raw) as Partial<TodoState>;

    if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.categories)) {
      return DEFAULT_TODO_STATE;
    }

    return {
      name: parsed.name ?? 'Raphael',
      categories: parsed.categories,
      tasks: parsed.tasks,
    };
  } catch {
    return DEFAULT_TODO_STATE;
  }
}

async function saveTodoState(state: TodoState) {
  await AsyncStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(state));
}

async function loadCalendarEvents(): Promise<CalendarEventLike[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCalendarEvents(events: CalendarEventLike[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(events));
}

export async function applyTodoSuggestion(title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  const state = await loadTodoState();
  const fallbackCategoryId = state.categories[0]?.id ?? 'business';

  const nextTask: TodoTask = {
    id: uid('todo'),
    title: cleanTitle,
    categoryId: fallbackCategoryId,
    done: false,
    createdAt: Date.now(),
    reminderEnabled: false,
    reminderId: null,
  };

  const nextState: TodoState = {
    ...state,
    tasks: [nextTask, ...state.tasks],
  };

  await saveTodoState(nextState);
}

export async function applyHabitSuggestion(title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  const state = await loadHabitsState();

  const nextState = {
    name: state?.name ?? 'Raphael',
    habits: [
      {
        id: uid('habit'),
        title: cleanTitle,
        color: '#F5C451',
        targetPerDay: 1,
        checkins: {},
      },
      ...(state?.habits ?? []),
    ],
  };

  await saveHabitsState(nextState);
}

export async function applyCalendarSuggestion(
  title: string,
  start?: string,
  end?: string
) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  const events = await loadCalendarEvents();

  const fallbackStart = dayjs()
    .add(1, 'day')
    .hour(18)
    .minute(0)
    .second(0)
    .millisecond(0);

  const startDate = start ? dayjs(start) : fallbackStart;
  const endDate = end
    ? dayjs(end)
    : startDate.add(30, 'minute');

  const nextEvent: CalendarEventLike = {
    id: uid('event'),
    title: cleanTitle,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    color: '#D4AF37',
  };

  await saveCalendarEvents([nextEvent, ...events]);
}

export async function applyPlannerCard(card: {
  todo: string;
  habit: string;
  calendar: {
    title: string;
    start: string;
    end: string;
  };
}) {
  await applyTodoSuggestion(card.todo);
  await applyHabitSuggestion(card.habit);
  await applyCalendarSuggestion(
    card.calendar.title,
    card.calendar.start,
    card.calendar.end
  );
}
export async function applyRoutineSuggestion(
  routine: {
    title: string;
    blocks: Array<{
      title: string;
      start: string;
      end: string;
    }>;
  }
) {
  for (const block of routine.blocks) {
    await applyCalendarSuggestion(block.title || routine.title, block.start, block.end);
  }
}