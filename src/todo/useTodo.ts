import { useMemo, useState } from 'react';
import { Category, Task, TodoState } from './types';
import { cancelReminder, scheduleTaskReminder } from './notifications';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_CATEGORIES: Category[] = [
  // Gold + Silber Vibes (du kannst im Editor jede Farbe ändern)
  { id: 'business', name: 'Business', color: '#D4AF37' }, // gold
  { id: 'personal', name: 'Personal', color: '#C0C0C0' }, // silver
];

const DEFAULT_TASKS: Task[] = [
  { id: uid(), title: 'Daily meeting with team', categoryId: 'business', done: false, createdAt: Date.now() - 100000 },
  { id: uid(), title: 'Pay for rent', categoryId: 'personal', done: true, createdAt: Date.now() - 90000 },
  { id: uid(), title: 'Check emails', categoryId: 'business', done: false, createdAt: Date.now() - 80000 },
  { id: uid(), title: 'Lunch with Emma', categoryId: 'personal', done: false, createdAt: Date.now() - 70000 },
  { id: uid(), title: 'Meditation', categoryId: 'personal', done: false, createdAt: Date.now() - 60000 },
];

export function useTodo() {
  const [state, setState] = useState<TodoState>({
    name: 'Raphael',
    categories: DEFAULT_CATEGORIES,
    tasks: DEFAULT_TASKS,
  });

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const categoriesWithCounts = useMemo(() => {
    return state.categories.map((c) => {
      const count = state.tasks.filter((t) => !t.done && t.categoryId === c.id).length;
      return { ...c, count };
    });
  }, [state.categories, state.tasks]);

  const filteredTasks = useMemo(() => {
    const base = activeCategoryId ? state.tasks.filter((t) => t.categoryId === activeCategoryId) : state.tasks;
    return [...base].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
  }, [state.tasks, activeCategoryId]);

  const addTask = (title: string, categoryId: string) => {
    const t: Task = {
      id: uid(),
      title,
      categoryId,
      done: false,
      createdAt: Date.now(),
      reminderEnabled: false,
      reminderId: null,
    };
    setState((s) => ({ ...s, tasks: [t, ...s.tasks] }));
  };

  const toggleTaskDone = async (taskId: string) => {
    // wenn erledigt -> Reminder canceln
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
          ? { ...t, done: nextDone, reminderEnabled: nextDone ? false : t.reminderEnabled, reminderId: nextDone ? null : t.reminderId }
          : t
      ),
    }));
  };

  const toggleTaskReminder = async (taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.done) return; // keine Reminder für erledigte

    // aus -> an: schedule
    if (!task.reminderEnabled) {
      const id = await scheduleTaskReminder(task.title);
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, reminderEnabled: true, reminderId: id } : t)),
      }));
      return;
    }

    // an -> aus: cancel
    await cancelReminder(task.reminderId);
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, reminderEnabled: false, reminderId: null } : t)),
    }));
  };

  // Kategorien bearbeiten
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
        tasks: s.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: fallback ?? t.categoryId } : t)),
      };
    });

    setActiveCategoryId((cur) => (cur === id ? null : cur));
  };

  return {
    state,
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
  };
}