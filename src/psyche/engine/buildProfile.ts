import { MindsetProfile, PsycheSignals } from '../types';

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function to100(x01: number) {
  return Math.round(clamp01(x01) * 100);
}

export function buildProfile(signals: PsycheSignals): MindsetProfile {
  // Discipline: habits + todo completion
  const todoRate = signals.tasksTotal7d > 0 ? signals.tasksDone7d / signals.tasksTotal7d : 0.5;
  const habitVolume = clamp01(signals.habitCheckins7d / 20); // 20 checkins / week -> high
  const discipline = to100(0.55 * todoRate + 0.45 * habitVolume);

  // Consistency: days active in habits
  const consistency = to100(clamp01(signals.habitActiveDays7d / 7));

  // Focus: less but longer planning + early start helps; fallback to habits
  const focusBase = clamp01((signals.calendarHours7d / 25) * 0.6 + signals.calendarEarlyStartScore * 0.4);
  const focus = to100(0.65 * focusBase + 0.35 * clamp01(signals.habitCheckins7d / 18));

  // Planning: calendar utilization
  const planning = to100(clamp01(signals.calendarHours7d / 30));

  // Recovery: penalize extreme busy; reward moderate structure
  const overload = clamp01((signals.calendarHours7d - 35) / 20); // >35h planned -> overload
  const recovery = to100(clamp01(0.8 - overload)); // simpler first version

  // Momentum: map -1..+1 to 0..100
  const momentum = Math.round((signals.momentum7d + 1) * 50);

  return {
    discipline,
    consistency,
    focus,
    planning,
    recovery,
    momentum,
  };
}