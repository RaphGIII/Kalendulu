export type HabitCadence = 'daily' | 'selected_days' | 'weekly' | 'monthly';

export type Habit = {
  id: string;
  title: string;
  color: string;

  targetPerDay: number;
  checkins: Record<string, number>;

  description?: string;
  subcategory?: string | null;
  linkedGoalId?: string | null;

  cadence?: HabitCadence;
  targetCount?: number;
  weekdays?: number[];
  dayOfMonth?: number | null;
  durationMinutes?: number | null;
};

export type HabitState = {
  name: string;
  habits: Habit[];
};