import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Category, Task, TodoState } from './types';
import { cancelReminder, scheduleTaskReminder } from './notifications';

const TODO_STORAGE_KEY = 'kalendulu:todo:v1';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'business', name: 'Business', color: '#D4AF37' },
  { id: 'personal', name: 'Personal', color: '#C0C0C0' },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: uid(),
    title: 'Daily meeting with team',
    categoryId: 'business',
    done: false,
    createdAt: Date.now() - 100000,
    reminderEnabled: false,
    reminderId: null,
  },
  {
    id: uid(),
    title: 'Pay for rent',
    categoryId: 'personal',
    done: true,
    createdAt: Date.now() - 90000,
    reminderEnabled: false,
    reminderId: null,
  },
];

const DEFAULT_STATE: TodoState = {
  name: 'Raphael',
  categories: DEFAULT_CATEGORIES,
  tasks: DEFAULT_TASKS,
};

export function useTodo() {
  const [state, setState] = useState<TodoState>(DEFAULT_STATE);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TODO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TodoState;
        if (parsed?.tasks && parsed?.categories) {
          setState(parsed);
          return;
        }
      }
      setState(DEFAULT_STATE);
    } catch (e) {
      console.log('Failed to load todo state', e);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState])
  );

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.log('Failed to save todo state', e)
    );
  }, [state, hydrated]);

  const categoriesWithCounts = useMemo(() => {
    return state.categories.map((c) => {
      const count = state.tasks.filter((t) => !t.done && t.categoryId === c.id).length;
      return { ...c, count };
    });
  }, [state.categories, state.tasks]);

  const filteredTasks = useMemo(() => {
    const base = activeCategoryId
      ? state.tasks.filter((t) => t.categoryId === activeCategoryId)
      : state.tasks;

    return [...base].sort(
      (a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt
    );
  }, [state.tasks, activeCategoryId]);

  const addTask = (title: string, categoryId: string) => {
    const categoryExists = state.categories.some((c) => c.id === categoryId);
    const fallbackCategoryId = state.categories[0]?.id ?? 'business';

    const t: Task = {
      id: uid(),
      title,
      categoryId: categoryExists ? categoryId : fallbackCategoryId,
      done: false,
      createdAt: Date.now(),
      reminderEnabled: false,
      reminderId: null,
    };

    setState((s) => ({ ...s, tasks: [t, ...s.tasks] }));
  };

  const toggleTaskDone = async (taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextDone = !task.done;

    if (nextDone && task.reminderId) {
      await cancelReminder(task.reminderId);
    }

    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              done: nextDone,
              reminderEnabled: nextDone ? false : t.reminderEnabled,
              reminderId: nextDone ? null : t.reminderId,
            }
          : t
      ),
    }));
  };

  const toggleTaskReminder = async (taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.done) return;

    if (!task.reminderEnabled) {
      const id = await scheduleTaskReminder(task.title);
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, reminderEnabled: true, reminderId: id } : t
        ),
      }));
      return;
    }

    await cancelReminder(task.reminderId);
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, reminderEnabled: false, reminderId: null } : t
      ),
    }));
  };

  const addCategory = (name: string, color: string) => {
    const c: Category = { id: uid(), name, color };
    setState((s) => ({ ...s, categories: [...s.categories, c] }));
  };

  const renameCategory = (id: string, name: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  };

  const recolorCategory = (id: string, color: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, color } : c)),
    }));
  };

  const deleteCategory = (id: string) => {
    setState((s) => {
      const remaining = s.categories.filter((c) => c.id !== id);
      const fallback = remaining[0]?.id ?? null;

      return {
        ...s,
        categories: remaining,
        tasks: s.tasks.map((t) =>
          t.categoryId === id ? { ...t, categoryId: fallback ?? t.categoryId } : t
        ),
      };
    });

    setActiveCategoryId((cur) => (cur === id ? null : cur));
  };

  return {
    state,
    hydrated,
    activeCategoryId,
    setActiveCategoryId,
    categoriesWithCounts,
    filteredTasks,
    addTask,
    toggleTaskDone,
    toggleTaskReminder,
    addCategory,
    renameCategory,
    recolorCategory,
    deleteCategory,
    reload: loadState,
  };
}