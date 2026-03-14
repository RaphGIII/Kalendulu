export type MotivationStyleId =
  | 'calm'
  | 'direct'
  | 'aggressive'
  | 'strategic'
  | 'supportive'
  | 'winner'
  | 'coach'
  | 'stoic';

export type PsycheReflection = {
  title: string;
  headline?: string;
  message: string;
  body?: string;
  action: string;
  tone?: MotivationStyleId;
};

export type PsycheSettings = {
  reflectionTone?: 'gentle' | 'balanced' | 'intense';
  motivationStyle?: MotivationStyleId;
};

export type GoalCategory =
  | 'fitness'
  | 'study'
  | 'language'
  | 'career'
  | 'business'
  | 'mindset'
  | 'health'
  | 'creative'
  | 'writing'
  | 'research'
  | 'project'
  | 'music'
  | 'skill'
  | 'personal'
  | 'general'
  | 'other';

export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type GoalDifficulty = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
export type GoalComplexity = 'simple' | 'moderate' | 'advanced' | 'high_complexity';
export type GoalHorizon = 'short' | 'medium' | 'long' | 'week' | 'month' | 'year' | 'fiveYears';

export type GoalQuestionType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'single_choice'
  | 'multi_choice'
  | 'date'
  | 'scale';

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
  helpText?: string;
  section?: string;
  priority?: number;
  whyAsked?: string;
  min?: number;
  max?: number;
};

export type GoalAnswerValue = string | number | string[];
export type GoalAnswerMap = Record<string, GoalAnswerValue | undefined>;

export type GoalMetricKind =
  | 'skill'
  | 'consistency'
  | 'output'
  | 'knowledge'
  | 'confidence'
  | 'performance'
  | 'custom';

export type GoalMetric = {
  id: string;
  label: string;
  kind: GoalMetricKind;
  current: number;
  target: number;
  weight: number;
  unit?: string;
};

export type GoalMilestoneStatus = 'locked' | 'active' | 'done';

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
  todayFocus?: string;
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

export type GoalHabitCadence = 'daily' | 'weekly' | 'selected_days' | 'monthly';

export type GoalHabitPlan = {
  id: string;
  title: string;
  shortTitle?: string;
  reason: string;
  details?: string;
  frequencyPerWeek: number;
  durationMinutes: number;
  difficulty: 'light' | 'medium' | 'deep';
  cadence?: GoalHabitCadence;
  weekdays?: number[];
  dayOfMonth?: number;
  preferredMoments?: string[];
  categoryLabel?: string;
  goalMilestoneId?: string;
};

export type GoalTodoPlan = {
  id: string;
  title: string;
  shortTitle?: string;
  reason: string;
  details?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
  categoryLabel?: string;
  milestoneId?: string;
};

export type GoalCalendarBlockPlan = {
  id: string;
  title: string;
  shortTitle?: string;
  reason: string;
  dayLabel: string;
  startTime: string;
  durationMinutes: number;
  categoryLabel?: string;
  details?: string;
};

export type GoalExecutionPlan = {
  intensityPreset: GoalIntensityPreset;
  habits: GoalHabitPlan[];
  todos: GoalTodoPlan[];
  calendarBlocks: GoalCalendarBlockPlan[];
};

export type GoalIntensityPreset = 'gentle' | 'balanced' | 'ambitious' | 'extreme';

export type AdaptivePlanStyle =
  | 'compact'
  | 'balanced'
  | 'deep'
  | 'full_system';

export type GoalPlanPreference = {
  style: AdaptivePlanStyle;
  includeCalendar: boolean;
  includeHabits: boolean;
  includeTodos: boolean;
  includeExplanations: boolean;
  desiredStructure: 'simple' | 'step_by_step' | 'detailed';
};

export type GoalMiniStepStatus = 'locked' | 'active' | 'upcoming' | 'done';

export type GoalMiniStep = {
  id: string;
  order: number;
  status: GoalMiniStepStatus;
  title: string;
  description: string;
  linkedTodoTitles: string[];
  linkedHabitTitles: string[];
};

export type GoalExecutionStepStatus = 'locked' | 'available' | 'done';

export type GoalExecutionChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type GoalExecutionStep = {
  id: string;
  order: number;
  title: string;
  explanation: string;
  whyItMatters: string;
  estimatedDays?: number;
  status: GoalExecutionStepStatus;
  checklist: GoalExecutionChecklistItem[];
  linkedTodoTitles: string[];
  linkedHabitTitles: string[];
};

export type GoalReviewPrompt = {
  id: string;
  question: string;
};

export type GoalSemanticMatch = {
  matchedConcepts: string[];
  matchedAliases?: string[];
  confidence: number;
  category: GoalCategory;
  normalizedText?: string;
};

export type GoalAIAnalysis = {
  category: GoalCategory;
  complexity: GoalComplexity;
  difficulty: GoalDifficulty;
  targetClarity: number;
  ambiguityScore: number;
  recommendedQuestionCount: number;
  shouldAskDeepQuestions: boolean;
  rationale: string[];
  missingInformation: string[];
  planDepth: AdaptivePlanStyle;
};

export type GoalQuestionSet = {
  goalLabel: string;
  goalType: GoalCategory;
  complexity: GoalComplexity;
  difficulty: GoalDifficulty;
  questions: GoalQuestion[];
};

export type GoalRefinementResponse = {
  goalLabel: string;
  goalType: string;
  questions: GoalQuestion[];
  analysis?: {
    category?: string;
    complexity?: GoalComplexity | string;
    difficulty?: GoalDifficulty | string;
    rationale?: string[];
    missingInformation?: string[];
    recommendedQuestionCount?: number;
  };
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

export type PlannerExecutionChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type PlannerExecutionStep = {
  id: string;
  order: number;
  title: string;
  explanation: string;
  whyItMatters: string;
  estimatedDays?: number;
  checklist: PlannerExecutionChecklistItem[];
  linkedTodoTitles: string[];
  linkedHabitTitles: string[];
};

export type PlannerSuggestionItem =
  | { id: string; type: 'todo'; title: string; subtitle?: string }
  | { id: string; type: 'habit'; title: string; subtitle?: string }
  | { id: string; type: 'calendar'; title: string; subtitle?: string };

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
  executionSteps?: PlannerExecutionStep[];
  planMeta?: {
    depth?: 'compact' | 'balanced' | 'deep' | 'full_system' | string;
    difficulty?: string;
    complexity?: string;
    summary?: string;
  };
  suggestions?: PlannerSuggestionItem[];
  goal?: unknown;
  motivation?: string;
};

export type PlannerOutput = PlannerBundle;
export type PsycheGoalPlan = PlannerBundle;

export type CalendarEventLike = {
  id?: string;
  title: string;
  start: string | Date;
  end: string | Date;
  color?: string;
  location?: string;
  description?: string;
};

export type TodoLikeTask = {
  id: string;
  title: string;
  categoryId?: string | null;
  done: boolean;
  createdAt: number;
  reminderEnabled?: boolean;
  reminderId?: string | null;
  note?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
};

export type TodoTaskLike = TodoLikeTask;

export type TodoCategoryLike = {
  id: string;
  name: string;
  color: string;
};

export type TodoStateLike = {
  name?: string;
  categories: TodoCategoryLike[];
  tasks: TodoLikeTask[];
};

export type HabitLike = {
  id: string;
  title: string;
  color: string;
  targetPerDay: number;
  checkins: Record<string, number>;
  description?: string;
  subcategory?: string;
  cadence?: GoalHabitCadence | string;
  weekdays?: number[];
  dayOfMonth?: number | null;
  durationMinutes?: number;
};

export type HabitsStateLike = {
  name?: string;
  habits: HabitLike[];
};

export type PsycheSuggestedTodo = {
  id?: string;
  goalId?: string;
  title: string;
  categoryId?: string | null;
  note?: string;
  subcategory?: string;
  priority?: 'low' | 'medium' | 'high';
  reason?: string;
};

export type PsycheSuggestedHabit = {
  id?: string;
  goalId?: string;
  title: string;
  color?: string;
  description?: string;
  subcategory?: string;
  targetPerDay?: number;
  frequencyPerDay?: number;
  cadence?: GoalHabitCadence | string;
  weekdays?: number[];
  dayOfMonth?: number | null;
  durationMinutes?: number;
  reason?: string;
};

export type PsycheSuggestedCalendarBlock = {
  id?: string;
  goalId?: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  location?: string;
  description?: string;
  reason?: string;
};

export type PsycheFreeSlot = {
  start: string;
  end: string;
  durationMinutes: number;
  minutes?: number;
};

export type GoalLinkEntry = {
  goalId: string;
  todoIds: Array<string | undefined>;
  habitIds: Array<string | undefined>;
  calendarIds: Array<string | undefined>;
  todoTitles: string[];
  habitTitles: string[];
  calendarTitles: string[];
  updatedAt: string;
};

export type GoalLinkMap = Record<string, GoalLinkEntry>;

export type PsycheGoal = {
  id: string;
  title: string;

  category: GoalCategory;
  status: GoalStatus;
  createdAt: string | number;
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
  difficulty?: GoalDifficulty;
  horizon?: GoalHorizon;
  active?: boolean;

  currentSituation?: string;
  successVision?: string;
  mainObstacle?: string;
  availableDaysLabel?: string;
  preferredPlanStyle?: 'small_steps' | 'structured' | 'flexible' | 'push';

  aiAnalysis?: GoalAIAnalysis;
  planPreference?: GoalPlanPreference;
  dynamicQuestions?: GoalQuestion[];
  executionSteps?: GoalExecutionStep[];
  miniSteps?: GoalMiniStep[];
  reviewPrompts?: GoalReviewPrompt[];
  lastGeneratedFromAnswers?: GoalAnswerMap;

  semantic?: GoalSemanticMatch;
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