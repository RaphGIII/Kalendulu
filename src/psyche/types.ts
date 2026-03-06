export type MotivationStyleId = 'winner' | 'coach' | 'stoic' | 'friend';

export type PsycheSettings = {
  style: MotivationStyleId;
  intensity: 1 | 2 | 3; // 1 = soft, 3 = strong
};

export type PsycheSignals = {
  // Habits
  habitCheckinsToday: number;
  habitCheckins7d: number;
  habitActiveDays7d: number; // days with any habit checkin

  // To-Do (optional)
  tasksDoneToday: number;
  tasksDone7d: number;
  tasksTotal7d: number;

  // Calendar (optional)
  calendarHoursToday: number;
  calendarHours7d: number;
  calendarEarlyStartScore: number; // 0..1

  // Derived
  momentum7d: number; // -1..+1 approx
};

export type MindsetProfile = {
  discipline: number;   // 0..100
  consistency: number;  // 0..100
  focus: number;        // 0..100
  planning: number;     // 0..100
  recovery: number;     // 0..100
  momentum: number;     // 0..100
};

export type PsycheReflection = {
  title: string;
  body: string;
  microAction: string;
  tags: string[];
};

export type PsycheDailySnapshot = {
  dateKey: string; // YYYY-MM-DD
  signals: PsycheSignals;
  profile: MindsetProfile;
};

export type TodoLikeTask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  // optional future fields: difficulty, dueDate, etc.
};

export type HabitsStateLike = {
  name?: string;
  habits: Array<{
    id: string;
    title: string;
    color: string;
    targetPerDay: number;
    checkins: Record<string, number>;
  }>;
};

export type TodoStateLike = {
  name?: string;
  tasks: TodoLikeTask[];
};

export type CalendarEventLike = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
};