export type Habit = {
  id: string;
  title: string;
  color: string;      // Akzentfarbe
  targetPerDay: number; // z.B. 1 (einmal täglich) oder 2 (zweimal)
  checkins: Record<string, number>; // key: YYYY-MM-DD, value: count
};

export type HabitState = {
  name: string;
  habits: Habit[];
};