import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Habit, HabitState } from './types';
import { loadHabitsState, saveHabitsState } from './storage';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULTS: Habit[] = [
  { id: uid(), title: 'Meditation', color: '#D4AF37', targetPerDay: 1, checkins: {} },
  { id: uid(), title: 'Workout', color: '#7C5CFF', targetPerDay: 1, checkins: {} },
  { id: uid(), title: 'Lesen', color: '#00C2C7', targetPerDay: 1, checkins: {} },
];

function isComplete(h: Habit, dateKey: string) {
  return (h.checkins[dateKey] ?? 0) >= h.targetPerDay;
}

function calcStreaks(h: Habit) {
  // current streak: count backwards from today
  let cur = 0;
  let d = dayjs();
  while (isComplete(h, d.format('YYYY-MM-DD'))) {
    cur += 1;
    d = d.subtract(1, 'day');
  }

  // best streak: scan all recorded dates (simple & robust)
  const keys = Object.keys(h.checkins).sort(); // YYYY-MM-DD
  if (keys.length === 0) return { current: cur, best: cur };

  let best = 0;
  let run = 0;
  let prev: dayjs.Dayjs | null = null;

  for (const k of keys) {
    const day = dayjs(k);
    const complete = isComplete(h, k);
    if (!complete) {
      run = 0;
      prev = day;
      continue;
    }

    if (!prev) {
      run = 1;
    } else {
      const diff = day.diff(prev, 'day');
      run = diff === 1 ? run + 1 : 1;
    }

    best = Math.max(best, run);
    prev = day;
  }

  best = Math.max(best, cur);
  return { current: cur, best };
}

export function useHabits() {
  const [state, setState] = useState<HabitState>({
    name: 'Raphael',
    habits: DEFAULTS,
  });

  const [hydrated, setHydrated] = useState(false);

  // Load once
  useEffect(() => {
    (async () => {
      const saved = await loadHabitsState();
      if (saved?.habits?.length) setState(saved);
      setHydrated(true);
    })();
  }, []);

  // Save on changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveHabitsState(state);
  }, [state, hydrated]);

  const todayKey = dayjs().format('YYYY-MM-DD');

  const toggleCheckin = (habitId: string, dateKey = todayKey) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const current = h.checkins[dateKey] ?? 0;
        const next = current >= h.targetPerDay ? 0 : current + 1;
        return { ...h, checkins: { ...h.checkins, [dateKey]: next } };
      }),
    }));
  };

  const addHabit = (title: string, color: string, targetPerDay: number) => {
    const h: Habit = { id: uid(), title, color, targetPerDay, checkins: {} };
    setState((s) => ({ ...s, habits: [h, ...s.habits] }));
  };

  const removeHabit = (habitId: string) => {
    setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== habitId) }));
  };

  const renameHabit = (habitId: string, title: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === habitId ? { ...h, title } : h)),
    }));
  };

  const recolorHabit = (habitId: string, color: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === habitId ? { ...h, color } : h)),
    }));
  };

  const setTarget = (habitId: string, targetPerDay: number) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === habitId ? { ...h, targetPerDay } : h)),
    }));
  };

  // 7-Tage Trend (alle Habits)
  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day'));
    return days.map((d) => {
      const key = d.format('YYYY-MM-DD');
      const sum = state.habits.reduce((acc, h) => acc + (h.checkins[key] ?? 0), 0);
      return { key, label: d.format('dd'), value: sum };
    });
  }, [state.habits]);

  // Monthly heatmap intensity: total checkins per day across all habits
  const monthHeatmap = useMemo(() => {
    const m = dayjs();
    const start = m.startOf('month');
    const end = m.endOf('month');
    const out: Record<string, number> = {};

    for (let d = start; d.isBefore(end.add(1, 'day')); d = d.add(1, 'day')) {
      const key = d.format('YYYY-MM-DD');
      out[key] = state.habits.reduce((acc, h) => acc + (h.checkins[key] ?? 0), 0);
    }
    return out;
  }, [state.habits]);

  // Streaks per habit
  const streaksByHabitId = useMemo(() => {
    const map: Record<string, { current: number; best: number }> = {};
    for (const h of state.habits) map[h.id] = calcStreaks(h);
    return map;
  }, [state.habits]);

  return {
    state,
    todayKey,
    hydrated,

    last7,
    monthHeatmap,
    streaksByHabitId,

    toggleCheckin,
    addHabit,
    removeHabit,
    renameHabit,
    recolorHabit,
    setTarget,
  };
}