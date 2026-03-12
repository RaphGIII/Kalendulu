import dayjs from 'dayjs';
import type {
  GoalAnswerMap,
  GoalCategory,
  GoalConstraintProfile,
  GoalDiagnostic,
  GoalMetric,
  GoalPlanRequirements,
  GoalQuestion,
  PsycheGoal,
  UserPlanningProfile,
} from '../types';
import { buildDynamicMilestones, buildExecutionPlan } from './goalExecutionPlan';
import { evaluateGoalDifficulty } from './goalDifficulty';
import { buildDifficultyAwareRecommendation } from './goalRecommendationEngine';
import { evaluateGoalBackend } from './backendGoalEvaluator';
import { refineRecommendation } from './recommendationRefiner';

type BuildGoalFromAnswersInput = {
  title: string;
  category: GoalCategory;
  answers: GoalAnswerMap;
  profile?: UserPlanningProfile | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getString(answers: GoalAnswerMap, key: string, fallback = '') {
  const value = answers[key];
  return typeof value === 'string' ? value.trim() : fallback;
}

function getNumber(answers: GoalAnswerMap, key: string, fallback = 0) {
  const value = answers[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getStringArray(answers: GoalAnswerMap, key: string): string[] {
  const value = answers[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function estimateWeeksNeededByDifficulty(
  difficulty: ReturnType<typeof evaluateGoalDifficulty>['difficulty'],
  category: GoalCategory,
  availableDaysPerWeek: number,
  minutesPerDay: number
) {
  const weeklyMinutes = Math.max(30, availableDaysPerWeek * minutesPerDay);

  let baseHours = 24;

  switch (category) {
    case 'music':
      baseHours = 60;
      break;
    case 'language':
      baseHours = 64;
      break;
    case 'study':
      baseHours = 48;
      break;
    case 'fitness':
      baseHours = 36;
      break;
    case 'business':
      baseHours = 55;
      break;
    case 'career':
      baseHours = 42;
      break;
    case 'creative':
      baseHours = 46;
      break;
    default:
      baseHours = 34;
      break;
  }

  const factor =
    difficulty === 'very_easy'
      ? 0.60
      : difficulty === 'easy'
      ? 0.82
      : difficulty === 'medium'
      ? 1
      : difficulty === 'hard'
      ? 1.28
      : 1.58;

  const totalMinutesNeeded = baseHours * 60 * factor;
  return Math.max(2, Math.ceil(totalMinutesNeeded / weeklyMinutes));
}

function buildMetrics(category: GoalCategory): GoalMetric[] {
  switch (category) {
    case 'music':
      return [
        { id: 'accuracy', label: 'Genauigkeit', kind: 'performance', current: 10, target: 100, weight: 0.35, unit: '%' },
        { id: 'consistency', label: 'Konstanz', kind: 'consistency', current: 20, target: 100, weight: 0.25, unit: '%' },
        { id: 'technique', label: 'Technik', kind: 'skill', current: 10, target: 100, weight: 0.20, unit: '%' },
        { id: 'confidence', label: 'Sicherheit', kind: 'confidence', current: 15, target: 100, weight: 0.20, unit: '%' },
      ];
    case 'fitness':
      return [
        { id: 'consistency', label: 'Konstanz', kind: 'consistency', current: 20, target: 100, weight: 0.35, unit: '%' },
        { id: 'performance', label: 'Leistung', kind: 'performance', current: 15, target: 100, weight: 0.30, unit: '%' },
        { id: 'recovery', label: 'Erholung', kind: 'custom', current: 20, target: 100, weight: 0.15, unit: '%' },
        { id: 'confidence', label: 'Selbstvertrauen', kind: 'confidence', current: 20, target: 100, weight: 0.20, unit: '%' },
      ];
    case 'study':
    case 'language':
      return [
        { id: 'knowledge', label: 'Verständnis', kind: 'knowledge', current: 15, target: 100, weight: 0.35, unit: '%' },
        { id: 'consistency', label: 'Konstanz', kind: 'consistency', current: 20, target: 100, weight: 0.25, unit: '%' },
        { id: 'output', label: 'Anwendung', kind: 'output', current: 10, target: 100, weight: 0.20, unit: '%' },
        { id: 'confidence', label: 'Sicherheit', kind: 'confidence', current: 20, target: 100, weight: 0.20, unit: '%' },
      ];
    default:
      return [
        { id: 'clarity', label: 'Klarheit', kind: 'custom', current: 20, target: 100, weight: 0.25, unit: '%' },
        { id: 'consistency', label: 'Konstanz', kind: 'consistency', current: 20, target: 100, weight: 0.35, unit: '%' },
        { id: 'output', label: 'Umsetzung', kind: 'output', current: 15, target: 100, weight: 0.25, unit: '%' },
        { id: 'confidence', label: 'Sicherheit', kind: 'confidence', current: 20, target: 100, weight: 0.15, unit: '%' },
      ];
  }
}

function buildRequirements(params: {
  difficulty: ReturnType<typeof evaluateGoalDifficulty>['difficulty'];
  availableDaysPerWeek: number;
  minutesPerDay: number;
  estimatedWeeksNeeded: number;
}) {
  const { difficulty, availableDaysPerWeek, minutesPerDay, estimatedWeeksNeeded } = params;

  const requiredMinutesPerWeek = availableDaysPerWeek * minutesPerDay;

  const requiredHabitsPerWeek =
    difficulty === 'very_easy'
      ? Math.max(2, availableDaysPerWeek - 1)
      : difficulty === 'easy'
      ? Math.max(2, availableDaysPerWeek)
      : difficulty === 'medium'
      ? Math.max(3, availableDaysPerWeek)
      : difficulty === 'hard'
      ? Math.max(4, Math.min(7, availableDaysPerWeek + 1))
      : Math.max(5, Math.min(7, availableDaysPerWeek + 2));

  const requiredFocusBlocksPerWeek =
    difficulty === 'very_easy'
      ? 2
      : difficulty === 'easy'
      ? 3
      : difficulty === 'medium'
      ? 4
      : difficulty === 'hard'
      ? 5
      : 6;

  const requiredTodosPerWeek =
    difficulty === 'very_easy'
      ? 2
      : difficulty === 'easy'
      ? 3
      : difficulty === 'medium'
      ? 4
      : difficulty === 'hard'
      ? 5
      : 6;

  const onTrackThreshold =
    difficulty === 'very_easy'
      ? 62
      : difficulty === 'easy'
      ? 68
      : difficulty === 'medium'
      ? 74
      : difficulty === 'hard'
      ? 79
      : 84;

  const requirements: GoalPlanRequirements = {
    requiredHabitsPerWeek,
    requiredTodosPerWeek,
    requiredFocusBlocksPerWeek,
    requiredMinutesPerWeek,
    estimatedWeeksNeeded,
    onTrackThreshold,
  };

  return requirements;
}

export function buildGoalFromAnswers({
  title,
  category,
  answers,
  profile,
}: BuildGoalFromAnswersInput): PsycheGoal {
  const startDate = dayjs().format('YYYY-MM-DD');

  const targetDateRaw = getString(
    answers,
    'goal_deadline',
    dayjs().add(8, 'week').format('YYYY-MM-DD')
  );

  const targetDate = dayjs(targetDateRaw).isValid()
    ? dayjs(targetDateRaw).format('YYYY-MM-DD')
    : dayjs().add(8, 'week').format('YYYY-MM-DD');

  const availableDaysPerWeek = clamp(getNumber(answers, 'available_days', 3), 1, 7);
  const minutesPerDay = clamp(
    getNumber(answers, 'minutes_per_day', profile?.preferredSessionMinutes ?? 30),
    10,
    240
  );

  const preferredTimeRaw = getString(answers, 'preferred_time', profile?.energyWindow ?? 'mixed');
  const preferredTime: GoalConstraintProfile['preferredTime'] =
    preferredTimeRaw === 'morning' ||
    preferredTimeRaw === 'afternoon' ||
    preferredTimeRaw === 'evening'
      ? preferredTimeRaw
      : 'mixed';

  const learningSpeedRaw = getString(answers, 'learning_speed', 'normal');
  const learningSpeed: GoalConstraintProfile['learningSpeed'] =
    learningSpeedRaw === 'slow' || learningSpeedRaw === 'fast' ? learningSpeedRaw : 'normal';

  const motivationPattern = getStringArray(answers, 'motivation_pattern');
  const biggestBlocker = getString(answers, 'biggest_blocker');
  const currentLevel = getString(answers, 'current_level', 'Startniveau noch unklar');
  const importance = clamp(getNumber(answers, 'goal_importance', 8), 1, 10);

  const intensity = importance >= 9 ? 5 : importance >= 7 ? 4 : importance >= 5 ? 3 : 2;

  const constraints: GoalConstraintProfile = {
    availableDaysPerWeek,
    minutesPerDay,
    preferredTime,
    intensity: intensity as 1 | 2 | 3 | 4 | 5,
    learningSpeed,
    stressTolerance: intensity >= 4 ? 'high' : intensity >= 3 ? 'medium' : 'low',
  };

  const difficultyProfile = evaluateGoalDifficulty({
    category,
    goalTitle: title,
    answers,
  });

  const estimatedWeeksNeeded = estimateWeeksNeededByDifficulty(
    difficultyProfile.difficulty,
    category,
    availableDaysPerWeek,
    minutesPerDay
  );

  const requirements = buildRequirements({
    difficulty: difficultyProfile.difficulty,
    availableDaysPerWeek,
    minutesPerDay,
    estimatedWeeksNeeded,
  });

  const deadlineWeeks = Math.max(1, dayjs(targetDate).diff(dayjs(startDate), 'week', true));
  const realismScore = clamp(Math.round((deadlineWeeks / estimatedWeeksNeeded) * 100), 15, 100);

  const blockers = [
    biggestBlocker,
    ...(motivationPattern.includes('pressure') ? [] : ['zu wenig äußerer Druck']),
    ...(availableDaysPerWeek <= 2 ? ['zu wenig Wiederholung pro Woche'] : []),
    ...(minutesPerDay < 20 ? ['Einheiten eventuell zu kurz'] : []),
    ...difficultyProfile.explanation,
  ].filter(Boolean);

  const strengths = [
    ...(importance >= 8 ? ['hohe Wichtigkeit'] : []),
    ...(availableDaysPerWeek >= 4 ? ['gute Wochenfrequenz'] : []),
    ...(minutesPerDay >= 35 ? ['solide Einheitsdauer'] : []),
    ...(motivationPattern.includes('tracking') ? ['Fortschrittsbewusstsein'] : []),
  ];

  const targetOutcome =
    getString(answers, 'success_definition') ||
    getString(answers, 'custom_success_definition') ||
    getString(answers, 'study_subject') ||
    getString(answers, 'language_name') ||
    title;

  const diagnostic: GoalDiagnostic = {
    currentLevelLabel: currentLevel,
    targetLevelLabel: targetOutcome,
    strengths,
    blockers,
    risks: realismScore < 65 ? ['Deadline aktuell eher ambitioniert'] : [],
    realismScore,
    confidenceScore: clamp(40 + importance * 5, 0, 100),
    estimatedDifficulty: difficultyProfile.difficulty,
    whyThisGoalMatters: getString(answers, 'why_this_goal_matters'),
  };

  const baseGoal: PsycheGoal = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    category,
    status: 'active',
    createdAt: new Date().toISOString(),
    startDate,
    targetDate,
    targetOutcome,
    why: getString(answers, 'why_this_goal_matters'),
    notes: '',
    userReportedProgress: 0,
    lastCheckInAt: undefined,
    metrics: buildMetrics(category),
    milestones: [],
    constraints,
    diagnostic,
    requirements,
    recommendation: buildDifficultyAwareRecommendation({
      title,
      category,
      difficultyProfile,
      estimatedWeeksNeeded,
      requiredMinutesPerWeek: requirements.requiredMinutesPerWeek,
      blockers,
    }),
    progress: undefined,
    executionPlan: undefined,
  };

  const executionPlan = buildExecutionPlan(baseGoal);
  const milestones = buildDynamicMilestones(baseGoal);

  const withPlan: PsycheGoal = {
    ...baseGoal,
    executionPlan,
    milestones,
  };

  const backendEvaluation = evaluateGoalBackend(withPlan);
  const refinedRecommendation = refineRecommendation(withPlan, backendEvaluation);

  return {
    ...withPlan,
    recommendation: refinedRecommendation,
  };
}

export function validateQuestionnaire(questions: GoalQuestion[], answers: GoalAnswerMap) {
  const missing = questions.filter((question) => {
    if (!question.required) return false;
    const value = answers[question.id];

    if (question.type === 'multi_choice') {
      return !Array.isArray(value) || value.length === 0;
    }

    if (question.type === 'number' || question.type === 'scale') {
      if (typeof value === 'number') return false;
      if (typeof value === 'string') return value.trim().length === 0;
      return true;
    }

    return typeof value !== 'string' || value.trim().length === 0;
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}