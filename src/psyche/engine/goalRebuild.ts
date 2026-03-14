import type {
  GoalExecutionPlan,
  GoalIntensityPreset,
  GoalPlanRecommendation,
  PsycheGoal,
} from '../types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mapMinutes(base: number, preset: GoalIntensityPreset) {
  if (preset === 'gentle') return Math.max(10, Math.round(base * 0.75));
  if (preset === 'balanced') return Math.max(15, base);
  if (preset === 'ambitious') return Math.max(20, Math.round(base * 1.2));
  return Math.max(25, Math.round(base * 1.4));
}

function mapFrequency(base: number, preset: GoalIntensityPreset) {
  if (preset === 'gentle') return Math.max(1, base - 1);
  if (preset === 'balanced') return base;
  if (preset === 'ambitious') return Math.min(7, base + 1);
  return Math.min(7, base + 2);
}

function mapRecommendation(goal: PsycheGoal, preset: GoalIntensityPreset): GoalPlanRecommendation {
  const existing = goal.recommendation;

  const intro =
    preset === 'gentle'
      ? 'Der Plan wurde bewusst leichter gemacht, damit du sicher dranbleibst.'
      : preset === 'balanced'
        ? 'Der Plan bleibt realistisch und klar umsetzbar.'
        : preset === 'ambitious'
          ? 'Der Plan fordert dich stärker, bleibt aber noch sauber kontrollierbar.'
          : 'Der Plan ist jetzt deutlich aggressiver. Zieh ihn nur so durch, wenn dein Alltag das wirklich hergibt.';

  return {
    summary: `${intro} ${existing?.summary ?? ''}`.trim(),
    todayFocus: existing?.todayFocus ?? 'Starte heute mit dem ersten klaren Schritt.',
    nextStep: existing?.nextStep ?? 'Nach 7 Tagen ehrlich prüfen und nachschärfen.',
    warning:
      preset === 'extreme'
        ? 'Achte besonders auf Überforderung und Einbruch nach wenigen Tagen.'
        : existing?.warning,
    suggestedDeadlineShiftDays:
      preset === 'gentle' ? 7 : preset === 'extreme' ? -3 : existing?.suggestedDeadlineShiftDays,
  };
}

function rebuildExecutionPlan(
  executionPlan: GoalExecutionPlan | undefined,
  preset: GoalIntensityPreset,
): GoalExecutionPlan | undefined {
  if (!executionPlan) return executionPlan;

  const next = clone(executionPlan);

  next.intensityPreset = preset;
  next.habits = next.habits.map((habit) => ({
    ...habit,
    durationMinutes: mapMinutes(habit.durationMinutes, preset),
    frequencyPerWeek: mapFrequency(habit.frequencyPerWeek, preset),
    difficulty:
      preset === 'gentle'
        ? 'light'
        : preset === 'balanced'
          ? habit.difficulty === 'deep' ? 'medium' : habit.difficulty
          : preset === 'ambitious'
            ? habit.difficulty === 'light' ? 'medium' : habit.difficulty
            : 'deep',
  }));

  next.todos =
    preset === 'gentle'
      ? next.todos.slice(0, 3)
      : preset === 'balanced'
        ? next.todos
        : [
            ...next.todos,
            {
              id: `todo_extra_${Math.random().toString(36).slice(2, 9)}`,
              title: preset === 'extreme' ? 'Zusätzlichen Leistungsblock planen' : 'Zusätzlichen Fokusblock planen',
              shortTitle: 'Extra Block',
              reason: 'Mit höherer Intensität brauchst du einen zusätzlichen kontrollierten Schub.',
              details: 'Nur übernehmen, wenn dein Alltag es wirklich trägt.',
              priority: preset === 'extreme' ? 'high' : 'medium',
              estimatedMinutes: preset === 'extreme' ? 30 : 20,
              categoryLabel: 'Intensität',
            },
          ];

  next.calendarBlocks = next.calendarBlocks.map((block) => ({
    ...block,
    durationMinutes: mapMinutes(block.durationMinutes, preset),
  }));

  return next;
}

export function rebuildGoalForIntensity(
  goal: PsycheGoal,
  preset: GoalIntensityPreset,
): PsycheGoal {
  const next = clone(goal);

  next.intensityPreset = preset;
  next.constraints.intensity =
    preset === 'gentle' ? 2 :
    preset === 'balanced' ? 3 :
    preset === 'ambitious' ? 4 : 5;

  next.executionPlan = rebuildExecutionPlan(goal.executionPlan, preset);
  next.requirements = {
    ...next.requirements,
    requiredMinutesPerWeek: mapMinutes(next.requirements.requiredMinutesPerWeek, preset),
    requiredHabitsPerWeek:
      preset === 'gentle'
        ? Math.max(2, next.requirements.requiredHabitsPerWeek - 1)
        : preset === 'extreme'
          ? Math.min(7, next.requirements.requiredHabitsPerWeek + 1)
          : next.requirements.requiredHabitsPerWeek,
  };

  next.recommendation = mapRecommendation(goal, preset);

  if (next.miniSteps?.length) {
    next.miniSteps = next.miniSteps.map((step, index) => ({
      ...step,
      description:
        index === 0 && preset === 'gentle'
          ? `${step.description} Der Einstieg soll extra leicht sein.`
          : index === 1 && preset === 'extreme'
            ? `${step.description} Der Rhythmus wird bewusst strenger gesetzt.`
            : step.description,
    }));
  }

  return next;
}