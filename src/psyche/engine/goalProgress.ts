import dayjs from 'dayjs';
import type {
  CalendarEventLike,
  GoalLinkEntry,
  GoalLinkMap,
  HabitLike,
  PsycheGoal,
  TodoTaskLike,
  GoalProgressBreakdown,
} from '../types';

type ComputeGoalProgressInput = {
  goal: PsycheGoal;
  habits?: HabitLike[] | null;
  tasks?: TodoTaskLike[] | null;
  calendarEvents?: CalendarEventLike[] | null;
  goalLinks?: GoalLinkMap | null;
  previousProgress?: number | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function getLinkedEntry(goal: PsycheGoal, goalLinks?: GoalLinkMap | null): GoalLinkEntry | null {
  if (!goalLinks) return null;
  return goalLinks[goal.id] ?? null;
}

function scoreLinkedHabits(goal: PsycheGoal, habits: HabitLike[], linked: GoalLinkEntry | null) {
  const now = dayjs();
  const recentKeys = Array.from({ length: 7 }, (_, i) =>
    now.subtract(i, 'day').format('YYYY-MM-DD')
  );

  const linkedHabits = habits.filter((habit) => {
    if (linked?.habitIds.includes(habit.id)) return true;
    if (linked?.habitTitles.some((title) => normalize(title) === normalize(habit.title))) return true;
    return false;
  });

  if (linkedHabits.length === 0) return 0;

  const checkins = linkedHabits.reduce((sum, habit) => {
    return (
      sum +
      recentKeys.reduce((dateSum, dateKey) => {
        return dateSum + Number(habit.checkins?.[dateKey] ?? 0);
      }, 0)
    );
  }, 0);

  return clamp((checkins / Math.max(1, goal.requirements.requiredHabitsPerWeek)) * 100);
}

function scoreLinkedTodos(goal: PsycheGoal, tasks: TodoTaskLike[], linked: GoalLinkEntry | null) {
  const linkedTasks = tasks.filter((task) => {
    if (linked?.todoIds.includes(task.id)) return true;
    if (linked?.todoTitles.some((title) => normalize(title) === normalize(task.title))) return true;
    return false;
  });

  if (linkedTasks.length === 0) return 0;

  const done = linkedTasks.filter((task) => task.done).length;
  return clamp((done / Math.max(1, goal.requirements.requiredTodosPerWeek)) * 100);
}

function scoreLinkedCalendar(
  goal: PsycheGoal,
  calendarEvents: CalendarEventLike[],
  linked: GoalLinkEntry | null
) {
  const linkedEvents = calendarEvents.filter((event) => {
    const eventId = typeof event.id === 'string' ? event.id : '';
    if (linked?.calendarIds.includes(eventId)) return true;
    if (
      linked?.calendarTitles.some((title) => normalize(title) === normalize(event.title))
    ) {
      return true;
    }
    return false;
  });

  if (linkedEvents.length === 0) return 0;

  return clamp((linkedEvents.length / Math.max(1, goal.requirements.requiredFocusBlocksPerWeek)) * 100);
}

function inferExecutionScore(
  goal: PsycheGoal,
  habits: HabitLike[],
  tasks: TodoTaskLike[],
  calendarEvents: CalendarEventLike[],
  linked: GoalLinkEntry | null
) {
  if (linked) {
    const habitScore = scoreLinkedHabits(goal, habits, linked);
    const todoScore = scoreLinkedTodos(goal, tasks, linked);
    const calendarScore = scoreLinkedCalendar(goal, calendarEvents, linked);

    return Math.round(habitScore * 0.45 + todoScore * 0.35 + calendarScore * 0.20);
  }

  const normalizedGoalText = normalize(goal.title).slice(0, 12);

  const relevantHabits = habits.filter((habit) =>
    normalize(habit.title).includes(normalizedGoalText)
  );
  const relevantTasks = tasks.filter((task) =>
    normalize(task.title).includes(normalizedGoalText)
  );

  const recentKeys = Array.from({ length: 7 }, (_, i) =>
    dayjs().subtract(i, 'day').format('YYYY-MM-DD')
  );

  const habitCheckins = relevantHabits.reduce((sum, habit) => {
    return (
      sum +
      recentKeys.reduce((dateSum, dateKey) => {
        return dateSum + Number(habit.checkins?.[dateKey] ?? 0);
      }, 0)
    );
  }, 0);

  const tasksDone = relevantTasks.filter((task) => task.done).length;

  const habitScore = clamp((habitCheckins / Math.max(1, goal.requirements.requiredHabitsPerWeek)) * 100);
  const todoScore = clamp((tasksDone / Math.max(1, goal.requirements.requiredTodosPerWeek)) * 100);

  return Math.round(habitScore * 0.55 + todoScore * 0.45);
}

function computeComplianceScore(goal: PsycheGoal) {
  const requiredMinutes = Math.max(30, goal.requirements.requiredMinutesPerWeek);
  const availableMinutes =
    Math.max(1, goal.constraints.availableDaysPerWeek) *
    Math.max(10, goal.constraints.minutesPerDay);

  return clamp((availableMinutes / requiredMinutes) * 100);
}

function computeMetricScore(goal: PsycheGoal) {
  if (!goal.metrics.length) return goal.userReportedProgress;

  const totalWeight = goal.metrics.reduce((sum, metric) => sum + Math.max(0, metric.weight), 0);
  if (totalWeight <= 0) return goal.userReportedProgress;

  const weighted = goal.metrics.reduce((sum, metric) => {
    const ratio = metric.target <= 0 ? 0 : clamp((metric.current / metric.target) * 100);
    return sum + ratio * Math.max(0, metric.weight);
  }, 0);

  return clamp(weighted / totalWeight);
}

function computeTrend(current: number, previous?: number | null): GoalProgressBreakdown['trend'] {
  if (typeof previous !== 'number') return 'steady';
  const delta = current - previous;
  if (delta >= 4) return 'up';
  if (delta <= -4) return 'down';
  return 'steady';
}

function computeLevel(total: number) {
  if (total >= 95) return 10;
  if (total >= 85) return 9;
  if (total >= 75) return 8;
  if (total >= 65) return 7;
  if (total >= 55) return 6;
  if (total >= 45) return 5;
  if (total >= 35) return 4;
  if (total >= 25) return 3;
  if (total >= 15) return 2;
  return 1;
}

export function computeGoalProgress({
  goal,
  habits,
  tasks,
  calendarEvents,
  goalLinks,
  previousProgress,
}: ComputeGoalProgressInput): GoalProgressBreakdown {
  const safeHabits = habits ?? [];
  const safeTasks = tasks ?? [];
  const safeCalendarEvents = calendarEvents ?? [];
  const linked = getLinkedEntry(goal, goalLinks);

  const complianceScore = Math.round(computeComplianceScore(goal));
  const executionScore = Math.round(
    inferExecutionScore(goal, safeHabits, safeTasks, safeCalendarEvents, linked)
  );
  const selfReportScore = clamp(goal.userReportedProgress);
  const metricScore = Math.round(computeMetricScore(goal));

  const total = Math.round(
    complianceScore * 0.22 +
      executionScore * 0.38 +
      selfReportScore * 0.15 +
      metricScore * 0.25
  );

  return {
    complianceScore,
    executionScore,
    selfReportScore,
    metricScore,
    total,
    trend: computeTrend(total, previousProgress),
    onTrack: total >= goal.requirements.onTrackThreshold,
    level: computeLevel(total),
  };
}

export function enrichGoalsWithProgress(
  goals: PsycheGoal[],
  habits?: HabitLike[] | null,
  tasks?: TodoTaskLike[] | null,
  calendarEvents?: CalendarEventLike[] | null,
  goalLinks?: GoalLinkMap | null
): PsycheGoal[] {
  return goals.map((goal) => {
    const progress = computeGoalProgress({
      goal,
      habits,
      tasks,
      calendarEvents,
      goalLinks,
      previousProgress: goal.progress?.total ?? null,
    });

    return {
      ...goal,
      progress,
    };
  });
}