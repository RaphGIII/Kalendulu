export type PsycheSettings = {
  reflectionTone?: 'gentle' | 'balanced' | 'intense';
  motivationStyle?: 'calm' | 'direct' | 'aggressive' | 'strategic';
};

export type GoalCategory =
  | 'music'
  | 'fitness'
  | 'study'
  | 'language'
  | 'career'
  | 'business'
  | 'mindset'
  | 'health'
  | 'creative'
  | 'other';

export type GoalDifficulty =
  | 'very_easy'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'very_hard';

export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type GoalMilestoneStatus = 'locked' | 'active' | 'done';

export type GoalMetricKind =
  | 'skill'
  | 'consistency'
  | 'output'
  | 'knowledge'
  | 'confidence'
  | 'performance'
  | 'custom';

export type GoalQuestionType =
  | 'text'
  | 'number'
  | 'single_choice'
  | 'multi_choice'
  | 'scale'
  | 'date';

export type QuestionOption = {
  id: string;
  label: string;
};

export type GoalQuestion = {
  id: string;
  title: string;
  type: GoalQuestionType;
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
  section?: string;
};

export type GoalAnswerValue = string | number | string[];
export type GoalAnswerMap = Record<string, GoalAnswerValue>;

export type GoalMetric = {
  id: string;
  label: string;
  kind: GoalMetricKind;
  current: number;
  target: number;
  weight: number;
  unit?: string;
};

export type GoalMilestone = {
  id: string;
  title: string;
  description?: string;
  targetPercent: number;
  status: GoalMilestoneStatus;
};

export type GoalConstraintProfile = {
  availableDaysPerWeek: number;
  minutesPerDay: number;
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'mixed';
  intensity: 1 | 2 | 3 | 4 | 5;
  learningSpeed: 'slow' | 'normal' | 'fast';
  stressTolerance: 'low' | 'medium' | 'high';
};

export type GoalDiagnostic = {
  currentLevelLabel: string;
  targetLevelLabel: string;
  strengths: string[];
  blockers: string[];
  risks: string[];
  realismScore: number;
  confidenceScore: number;
  estimatedDifficulty: GoalDifficulty;
  whyThisGoalMatters?: string;
};

export type GoalPlanRequirements = {
  requiredHabitsPerWeek: number;
  requiredTodosPerWeek: number;
  requiredFocusBlocksPerWeek: number;
  requiredMinutesPerWeek: number;
  estimatedWeeksNeeded: number;
  onTrackThreshold: number;
};

export type GoalPlanRecommendation = {
  summary: string;
  todayFocus: string;
  nextStep: string;
  warning?: string;
  suggestedDeadlineShiftDays?: number;
};

export type GoalProgressBreakdown = {
  complianceScore: number;
  executionScore: number;
  selfReportScore: number;
  metricScore: number;
  total: number;
  trend: 'up' | 'steady' | 'down';
  onTrack: boolean;
  level: number;
};

export type GoalHabitPlan = {
  id: string;
  title: string;
  reason: string;
  frequencyPerWeek: number;
  durationMinutes: number;
  difficulty: 'light' | 'medium' | 'deep';
};

export type GoalTodoPlan = {
  id: string;
  title: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
};

export type GoalCalendarBlockPlan = {
  id: string;
  title: string;
  reason: string;
  dayLabel: string;
  startTime: string;
  durationMinutes: number;
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

export type GoalRefinementResponse = {
  goalLabel: string;
  goalType: string;
  questions: GoalQuestion[];
};

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
export type GoalIntensityPreset = 'gentle' | 'balanced' | 'ambitious' | 'extreme';

export type PsycheSuggestedTodo = {
  id: string;
  title: string;
};

export type PsycheSuggestedHabit = {
  id: string;
  title: string;
  frequencyPerDay: number;
};

export type PsycheSuggestedCalendarBlock = {
  id: string;
  title: string;
  start: string;
  end: string;
};

export type GoalLinkEntry = {
  goalId: string;
  todoIds: string[];
  habitIds: string[];
  calendarIds: string[];
  todoTitles: string[];
  habitTitles: string[];
  calendarTitles: string[];
  updatedAt: string;
};

export type GoalLinkMap = Record<string, GoalLinkEntry>;
export type GoalExecutionPlan = {
  intensityPreset: GoalIntensityPreset;
  habits: GoalHabitPlan[];
  todos: GoalTodoPlan[];
  calendarBlocks: GoalCalendarBlockPlan[];
};

export type PsycheGoal = {
  id: string;
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  createdAt: string;
  startDate: string;
  targetDate: string;
  targetOutcome: string;
  why?: string;
  notes?: string;
  userReportedProgress: number;
  lastCheckInAt?: string;
  metrics: GoalMetric[];
  milestones: GoalMilestone[];
  constraints: GoalConstraintProfile;
  diagnostic: GoalDiagnostic;
  requirements: GoalPlanRequirements;
  recommendation?: GoalPlanRecommendation;
  progress?: GoalProgressBreakdown;
  executionPlan?: GoalExecutionPlan;
  intensityPreset?: GoalIntensityPreset;
};