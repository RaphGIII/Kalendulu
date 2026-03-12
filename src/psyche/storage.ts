import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PsycheDailySnapshot,
  PsycheGoal,
  PsycheSettings,
  GoalProgressBreakdown
} from './types';

const SETTINGS_KEY = 'kalendulu:psyche:settings:v2';
const HISTORY_KEY = 'kalendulu:psyche:history:v2';
const GOALS_KEY = 'kalendulu:psyche:goals:v2';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeGoal(raw: unknown): PsycheGoal | null {
  if (!isObject(raw)) return null;

  const now = new Date().toISOString();
  const title = typeof raw.title === 'string' ? raw.title : 'Unbenanntes Ziel';
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const userReportedProgress =
    typeof raw.userReportedProgress === 'number'
      ? Math.max(0, Math.min(100, raw.userReportedProgress))
      : 0;

  return {
    id,
    title,
    category: (raw.category as PsycheGoal['category']) ?? 'other',
    status: (raw.status as PsycheGoal['status']) ?? 'active',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    startDate: typeof raw.startDate === 'string' ? raw.startDate : now,
    targetDate: typeof raw.targetDate === 'string' ? raw.targetDate : now,
    targetOutcome:
      typeof raw.targetOutcome === 'string' ? raw.targetOutcome : title,
    why: typeof raw.why === 'string' ? raw.why : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    userReportedProgress,
    lastCheckInAt:
      typeof raw.lastCheckInAt === 'string' ? raw.lastCheckInAt : undefined,
    metrics: Array.isArray(raw.metrics) ? (raw.metrics as PsycheGoal['metrics']) : [],
    milestones: Array.isArray(raw.milestones)
      ? (raw.milestones as PsycheGoal['milestones'])
      : [],
    constraints: isObject(raw.constraints)
      ? {
          availableDaysPerWeek:
            typeof raw.constraints.availableDaysPerWeek === 'number'
              ? raw.constraints.availableDaysPerWeek
              : 3,
          minutesPerDay:
            typeof raw.constraints.minutesPerDay === 'number'
              ? raw.constraints.minutesPerDay
              : 30,
          preferredTime:
            (raw.constraints.preferredTime as PsycheGoal['constraints']['preferredTime']) ??
            'mixed',
          intensity:
            (raw.constraints.intensity as PsycheGoal['constraints']['intensity']) ?? 3,
          learningSpeed:
            (raw.constraints.learningSpeed as PsycheGoal['constraints']['learningSpeed']) ??
            'normal',
          stressTolerance:
            (raw.constraints.stressTolerance as PsycheGoal['constraints']['stressTolerance']) ??
            'medium',
        }
      : {
          availableDaysPerWeek: 3,
          minutesPerDay: 30,
          preferredTime: 'mixed',
          intensity: 3,
          learningSpeed: 'normal',
          stressTolerance: 'medium',
        },
    diagnostic: isObject(raw.diagnostic)
      ? {
          currentLevelLabel:
            typeof raw.diagnostic.currentLevelLabel === 'string'
              ? raw.diagnostic.currentLevelLabel
              : 'Start',
          targetLevelLabel:
            typeof raw.diagnostic.targetLevelLabel === 'string'
              ? raw.diagnostic.targetLevelLabel
              : 'Ziel',
          strengths: Array.isArray(raw.diagnostic.strengths)
            ? (raw.diagnostic.strengths as string[])
            : [],
          blockers: Array.isArray(raw.diagnostic.blockers)
            ? (raw.diagnostic.blockers as string[])
            : [],
          risks: Array.isArray(raw.diagnostic.risks)
            ? (raw.diagnostic.risks as string[])
            : [],
          realismScore:
            typeof raw.diagnostic.realismScore === 'number'
              ? raw.diagnostic.realismScore
              : 60,
          confidenceScore:
            typeof raw.diagnostic.confidenceScore === 'number'
              ? raw.diagnostic.confidenceScore
              : 50,
          estimatedDifficulty:
            (raw.diagnostic.estimatedDifficulty as PsycheGoal['diagnostic']['estimatedDifficulty']) ??
            'medium',
          whyThisGoalMatters:
            typeof raw.diagnostic.whyThisGoalMatters === 'string'
              ? raw.diagnostic.whyThisGoalMatters
              : '',
        }
      : {
          currentLevelLabel: 'Start',
          targetLevelLabel: 'Ziel',
          strengths: [],
          blockers: [],
          risks: [],
          realismScore: 60,
          confidenceScore: 50,
          estimatedDifficulty: 'medium',
          whyThisGoalMatters: '',
        },
    requirements: isObject(raw.requirements)
      ? {
          requiredHabitsPerWeek:
            typeof raw.requirements.requiredHabitsPerWeek === 'number'
              ? raw.requirements.requiredHabitsPerWeek
              : 3,
          requiredTodosPerWeek:
            typeof raw.requirements.requiredTodosPerWeek === 'number'
              ? raw.requirements.requiredTodosPerWeek
              : 4,
          requiredFocusBlocksPerWeek:
            typeof raw.requirements.requiredFocusBlocksPerWeek === 'number'
              ? raw.requirements.requiredFocusBlocksPerWeek
              : 3,
          requiredMinutesPerWeek:
            typeof raw.requirements.requiredMinutesPerWeek === 'number'
              ? raw.requirements.requiredMinutesPerWeek
              : 120,
          estimatedWeeksNeeded:
            typeof raw.requirements.estimatedWeeksNeeded === 'number'
              ? raw.requirements.estimatedWeeksNeeded
              : 8,
          onTrackThreshold:
            typeof raw.requirements.onTrackThreshold === 'number'
              ? raw.requirements.onTrackThreshold
              : 70,
        }
      : {
          requiredHabitsPerWeek: 3,
          requiredTodosPerWeek: 4,
          requiredFocusBlocksPerWeek: 3,
          requiredMinutesPerWeek: 120,
          estimatedWeeksNeeded: 8,
          onTrackThreshold: 70,
        },
    recommendation: isObject(raw.recommendation)
      ? {
          summary:
            typeof raw.recommendation.summary === 'string'
              ? raw.recommendation.summary
              : '',
          todayFocus:
            typeof raw.recommendation.todayFocus === 'string'
              ? raw.recommendation.todayFocus
              : '',
          nextStep:
            typeof raw.recommendation.nextStep === 'string'
              ? raw.recommendation.nextStep
              : '',
          warning:
            typeof raw.recommendation.warning === 'string'
              ? raw.recommendation.warning
              : undefined,
          suggestedDeadlineShiftDays:
            typeof raw.recommendation.suggestedDeadlineShiftDays === 'number'
              ? raw.recommendation.suggestedDeadlineShiftDays
              : undefined,
        }
      : undefined,
    progress: isObject(raw.progress)
      ? {
          complianceScore:
            typeof raw.progress.complianceScore === 'number'
              ? raw.progress.complianceScore
              : 0,
          executionScore:
            typeof raw.progress.executionScore === 'number'
              ? raw.progress.executionScore
              : 0,
          selfReportScore:
            typeof raw.progress.selfReportScore === 'number'
              ? raw.progress.selfReportScore
              : 0,
          metricScore:
            typeof raw.progress.metricScore === 'number'
              ? raw.progress.metricScore
              : 0,
          total: typeof raw.progress.total === 'number' ? raw.progress.total : 0,
            trend:
            (raw.progress.trend as GoalProgressBreakdown['trend']) ?? 'steady',
          onTrack: typeof raw.progress.onTrack === 'boolean' ? raw.progress.onTrack : false,
          level: typeof raw.progress.level === 'number' ? raw.progress.level : 1,
        }
      : undefined,
  };
}

export async function loadPsycheSettings(): Promise<PsycheSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PsycheSettings;
  } catch {
    return null;
  }
}

export async function savePsycheSettings(settings: PsycheSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function loadPsycheHistory(): Promise<PsycheDailySnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PsycheDailySnapshot[]) : [];
  } catch {
    return [];
  }
}

export async function savePsycheHistory(items: PsycheDailySnapshot[]) {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function loadPsycheGoals(): Promise<PsycheGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeGoal(item))
      .filter((item): item is PsycheGoal => !!item);
  } catch {
    return [];
  }
}

export async function savePsycheGoals(goals: PsycheGoal[]) {
  try {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {
    // ignore
  }
}