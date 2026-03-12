import dayjs from 'dayjs';
import type {
  GoalAnswerMap,
  GoalCategory,
  GoalDifficulty,
} from '../types';

export type GoalDifficultyProfile = {
  difficulty: GoalDifficulty;
  totalScore: number;
  scopeScore: number;
  skillGapScore: number;
  deadlinePressureScore: number;
  consistencyDemandScore: number;
  uncertaintyScore: number;
  resourceScore: number;
  explanation: string[];
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

function inferScopeScore(category: GoalCategory, goalTitle: string) {
  const title = goalTitle.toLowerCase();
  let score = 35;

  if (category === 'music' || category === 'language') score += 18;
  if (category === 'study' || category === 'business' || category === 'career') score += 12;

  if (
    title.includes('komplett') ||
    title.includes('fließend') ||
    title.includes('professionell') ||
    title.includes('perfekt') ||
    title.includes('bestehen') ||
    title.includes('mondscheinsonate')
  ) {
    score += 18;
  }

  if (title.length > 40) score += 10;

  return clamp(score);
}

function inferSkillGapScore(category: GoalCategory, answers: GoalAnswerMap) {
  let score = 40;

  const currentLevel = getString(answers, 'current_level').toLowerCase();
  const musicExperience = getString(answers, 'music_experience');
  const musicReading = getString(answers, 'music_reading');
  const languageLevel = getString(answers, 'language_level');
  const fitnessCurrent = getString(answers, 'fitness_current_state');

  if (
    currentLevel.includes('anfänger') ||
    currentLevel.includes('keine') ||
    currentLevel.includes('gar nicht')
  ) {
    score += 20;
  }

  if (category === 'music') {
    if (musicExperience === 'none') score += 20;
    if (musicReading === 'no') score += 15;
  }

  if (category === 'language') {
    if (languageLevel === 'a0') score += 20;
    if (languageLevel === 'a1') score += 12;
  }

  if (category === 'fitness') {
    if (fitnessCurrent === 'inactive') score += 16;
    if (fitnessCurrent === 'light') score += 8;
  }

  return clamp(score);
}

function inferDeadlinePressureScore(answers: GoalAnswerMap) {
  const deadlineRaw = getString(answers, 'goal_deadline');
  if (!deadlineRaw || !dayjs(deadlineRaw).isValid()) return 50;

  const weeks = Math.max(1, dayjs(deadlineRaw).diff(dayjs(), 'week', true));

  if (weeks <= 2) return 95;
  if (weeks <= 4) return 82;
  if (weeks <= 8) return 68;
  if (weeks <= 12) return 55;
  if (weeks <= 20) return 40;
  return 28;
}

function inferConsistencyDemandScore(category: GoalCategory, answers: GoalAnswerMap) {
  const availableDays = clamp(getNumber(answers, 'available_days', 3), 1, 7);
  const minutesPerDay = clamp(getNumber(answers, 'minutes_per_day', 30), 10, 240);

  let score = 45;

  if (category === 'music' || category === 'language' || category === 'study') score += 12;
  if (availableDays <= 2) score += 20;
  if (minutesPerDay < 20) score += 15;
  if (availableDays >= 5 && minutesPerDay >= 35) score -= 10;

  return clamp(score);
}

function inferUncertaintyScore(category: GoalCategory, goalTitle: string, answers: GoalAnswerMap) {
  let score = 35;
  const title = goalTitle.toLowerCase();

  const successDefinition =
    getString(answers, 'success_definition') ||
    getString(answers, 'custom_success_definition');

  if (!successDefinition) score += 18;
  if (title.includes('besser') || title.includes('gut') || title.includes('stärker')) score += 14;
  if (category === 'other' || category === 'mindset' || category === 'creative') score += 12;

  const blockers = getString(answers, 'biggest_blocker');
  if (!blockers) score += 10;

  return clamp(score);
}

function inferResourceScore(answers: GoalAnswerMap) {
  let score = 45;

  const availableDays = clamp(getNumber(answers, 'available_days', 3), 1, 7);
  const minutesPerDay = clamp(getNumber(answers, 'minutes_per_day', 30), 10, 240);
  const supportSystem = getString(answers, 'support_system');
  const risks = getStringArray(answers, 'consistency_risk');

  if (availableDays <= 2) score += 16;
  if (minutesPerDay < 20) score += 16;
  if (minutesPerDay >= 45) score -= 10;
  if (supportSystem) score -= 8;
  if (risks.includes('time')) score += 10;
  if (risks.includes('energy')) score += 10;

  return clamp(score);
}

function toDifficulty(totalScore: number): GoalDifficulty {
  if (totalScore >= 82) return 'very_hard';
  if (totalScore >= 67) return 'hard';
  if (totalScore >= 50) return 'medium';
  if (totalScore >= 34) return 'easy';
  return 'very_easy';
}

export function evaluateGoalDifficulty(params: {
  category: GoalCategory;
  goalTitle: string;
  answers: GoalAnswerMap;
}): GoalDifficultyProfile {
  const { category, goalTitle, answers } = params;

  const scopeScore = inferScopeScore(category, goalTitle);
  const skillGapScore = inferSkillGapScore(category, answers);
  const deadlinePressureScore = inferDeadlinePressureScore(answers);
  const consistencyDemandScore = inferConsistencyDemandScore(category, answers);
  const uncertaintyScore = inferUncertaintyScore(category, goalTitle, answers);
  const resourceScore = inferResourceScore(answers);

  const totalScore = Math.round(
    scopeScore * 0.22 +
      skillGapScore * 0.22 +
      deadlinePressureScore * 0.20 +
      consistencyDemandScore * 0.16 +
      uncertaintyScore * 0.10 +
      resourceScore * 0.10
  );

  const difficulty = toDifficulty(totalScore);

  const explanation: string[] = [];

  if (scopeScore >= 70) explanation.push('großer Zielumfang');
  if (skillGapScore >= 70) explanation.push('großer Fähigkeitsabstand');
  if (deadlinePressureScore >= 70) explanation.push('hoher Zeitdruck');
  if (consistencyDemandScore >= 70) explanation.push('hoher Wiederholungsbedarf');
  if (uncertaintyScore >= 65) explanation.push('Ziel noch zu unklar');
  if (resourceScore >= 65) explanation.push('begrenzte Ressourcen im Alltag');

  return {
    difficulty,
    totalScore,
    scopeScore,
    skillGapScore,
    deadlinePressureScore,
    consistencyDemandScore,
    uncertaintyScore,
    resourceScore,
    explanation,
  };
}