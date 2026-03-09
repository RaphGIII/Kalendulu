export type PsycheGoal = {
  id: string;
  title: string;
};

export type PsycheSignals = {
  habitCheckinsToday: number;
  habitCheckins7d: number;
  habitActiveDays7d: number;
  tasksDoneToday: number;
  tasksDone7d: number;
  tasksTotal7d: number;
  calendarHoursToday: number;
  calendarHours7d: number;
  calendarEarlyStartScore: number;
  momentum7d: number;
};

export type MindsetProfile = {
  discipline: number;
  consistency: number;
  focus: number;
  planning: number;
  recovery: number;
  momentum: number;
};

export type PsycheDailySnapshot = {
  dateKey: string;
  signals: PsycheSignals;
  profile: MindsetProfile;
};

export type PlannerCard = {
  todo: string;
  habit: string;
  calendar: {
    title: string;
    start: string;
    end: string;
  };
};

export type QuestionOption = {
  id: string;
  label: string;
};

export type GoalQuestion = {
  id: string;
  title: string;
  type: 'text' | 'single_choice' | 'multi_choice';
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
};

export type GoalRefinementResponse = {
  goalLabel: string;
  goalType: string;
  questions: GoalQuestion[];
};

export type GoalAnswerMap = Record<string, string | string[]>;

export type UserPlanningProfile = {
  energyWindow: 'morning' | 'afternoon' | 'evening' | 'mixed';
  planningStyle: 'structured' | 'flexible' | 'mixed';
  startStyle: 'gentle' | 'balanced' | 'intense';
  frictionPoints: string[];
  motivationDrivers: string[];
  preferredSessionMinutes: number;
  consistencyScore: number;
  completionStyle: 'small_steps' | 'deadline_pressure' | 'varied';
  successfulPatterns: string[];
  failedPatterns: string[];
};

export type PlannerReasonedText = {
  title: string;
  reason: string;
  instruction?: string;
  expectedEffect?: string;
};

export type PlannerCalendarBlock = {
  title: string;
  start: string;
  end: string;
  reason: string;
  instruction?: string;
};

export type PlannerRoutineBlock = {
  title: string;
  start: string;
  end: string;
};

export type PlannerRoutine = {
  title: string;
  reason: string;
  instruction?: string;
  frequencyPerWeek: number;
  durationMinutes?: number;
  reviewAfterDays?: number;
  blocks: PlannerRoutineBlock[];
};

export type PlannerReview = {
  reviewAfterDays: number;
  questions: string[];
};

export type PlannerBundle = {
  primary: {
    todo: PlannerReasonedText;
    habit: PlannerReasonedText;
    calendar: PlannerCalendarBlock;
    routines: PlannerRoutine[];
    scheduleAdjustment?: PlannerReasonedText;
    review?: PlannerReview;
  };
  alternatives: Array<{
    label: string;
    todo: PlannerReasonedText;
    habit: PlannerReasonedText;
    calendar: PlannerCalendarBlock;
  }>;
};

export type CalendarEventLike = {
  id?: string;
  title: string;
  start: string | Date;
  end: string | Date;
  color?: string;
  location?: string;
};

export type TodoTaskLike = {
  id: string;
  title: string;
  categoryId?: string | null;
  done: boolean;
  createdAt: number;
  reminderEnabled?: boolean;
  reminderId?: string | null;
};

export type TodoCategoryLike = {
  id: string;
  name: string;
  color: string;
};

export type TodoStateLike = {
  name?: string;
  categories: TodoCategoryLike[];
  tasks: TodoTaskLike[];
};

export type HabitLike = {
  id: string;
  title: string;
  color: string;
  targetPerDay: number;
  checkins: Record<string, number>;
};

export type HabitsStateLike = {
  name?: string;
  habits: HabitLike[];
};