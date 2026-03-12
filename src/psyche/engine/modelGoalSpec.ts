import type { GoalAnswerMap, PsycheGoal } from '../types';
import type { GoalDifficultyProfile } from './goalDifficulty';
import type { BackendGoalEvaluation } from './backendGoalEvaluator';

export type GoalModelSpec = {
  version: 'v2';
  goalId?: string;
  title: string;
  category: string;
  difficulty: string;
  difficultyScore: number;
  difficultyBreakdown: {
    scope: number;
    skillGap: number;
    deadlinePressure: number;
    consistencyDemand: number;
    uncertainty: number;
    resources: number;
  };
  backendEvaluation: {
    feasibility: string;
    structureQuality: string;
    planPressure: string;
    mainRisk: string;
    secondaryRisks: string[];
    shouldReduceScope: boolean;
    shouldIncreaseStructure: boolean;
    shouldAddMiniSteps: boolean;
    shouldSuggestDeadlineShift: boolean;
    suggestedDeadlineShiftDays: number;
  };
  targetDate: string;
  currentLevel: string;
  targetOutcome: string;
  blockers: string[];
  strengths: string[];
  realismScore: number;
  requiredMinutesPerWeek: number;
  requiredHabitsPerWeek: number;
  requiredTodosPerWeek: number;
  requiredFocusBlocksPerWeek: number;
  answers: GoalAnswerMap;
};

export function buildGoalModelSpec(params: {
  goal: PsycheGoal;
  answers: GoalAnswerMap;
  difficultyProfile: GoalDifficultyProfile;
  backendEvaluation: BackendGoalEvaluation;
}): GoalModelSpec {
  const { goal, answers, difficultyProfile, backendEvaluation } = params;

  return {
    version: 'v2',
    goalId: goal.id,
    title: goal.title,
    category: goal.category,
    difficulty: difficultyProfile.difficulty,
    difficultyScore: difficultyProfile.totalScore,
    difficultyBreakdown: {
      scope: difficultyProfile.scopeScore,
      skillGap: difficultyProfile.skillGapScore,
      deadlinePressure: difficultyProfile.deadlinePressureScore,
      consistencyDemand: difficultyProfile.consistencyDemandScore,
      uncertainty: difficultyProfile.uncertaintyScore,
      resources: difficultyProfile.resourceScore,
    },
    backendEvaluation: {
      feasibility: backendEvaluation.feasibility,
      structureQuality: backendEvaluation.structureQuality,
      planPressure: backendEvaluation.planPressure,
      mainRisk: backendEvaluation.mainRisk,
      secondaryRisks: backendEvaluation.secondaryRisks,
      shouldReduceScope: backendEvaluation.shouldReduceScope,
      shouldIncreaseStructure: backendEvaluation.shouldIncreaseStructure,
      shouldAddMiniSteps: backendEvaluation.shouldAddMiniSteps,
      shouldSuggestDeadlineShift: backendEvaluation.shouldSuggestDeadlineShift,
      suggestedDeadlineShiftDays: backendEvaluation.suggestedDeadlineShiftDays,
    },
    targetDate: goal.targetDate,
    currentLevel: goal.diagnostic.currentLevelLabel,
    targetOutcome: goal.targetOutcome,
    blockers: goal.diagnostic.blockers,
    strengths: goal.diagnostic.strengths,
    realismScore: goal.diagnostic.realismScore,
    requiredMinutesPerWeek: goal.requirements.requiredMinutesPerWeek,
    requiredHabitsPerWeek: goal.requirements.requiredHabitsPerWeek,
    requiredTodosPerWeek: goal.requirements.requiredTodosPerWeek,
    requiredFocusBlocksPerWeek: goal.requirements.requiredFocusBlocksPerWeek,
    answers,
  };
}

export function buildGoalModelPrompt(spec: GoalModelSpec) {
  return `
Du bist ein präzises Zielstrategie-Modell.
Antworte praktisch, konkret und realistisch.
Vermeide allgemeine Motivation und leere Floskeln.

Ziel:
${spec.title}

Kategorie:
${spec.category}

Schwierigkeit:
${spec.difficulty} (${spec.difficultyScore}/100)

Schwierigkeits-Breakdown:
- Scope: ${spec.difficultyBreakdown.scope}
- Skill Gap: ${spec.difficultyBreakdown.skillGap}
- Deadline Pressure: ${spec.difficultyBreakdown.deadlinePressure}
- Consistency Demand: ${spec.difficultyBreakdown.consistencyDemand}
- Uncertainty: ${spec.difficultyBreakdown.uncertainty}
- Resources: ${spec.difficultyBreakdown.resources}

Backend-Evaluation:
- Feasibility: ${spec.backendEvaluation.feasibility}
- Structure Quality: ${spec.backendEvaluation.structureQuality}
- Plan Pressure: ${spec.backendEvaluation.planPressure}
- Main Risk: ${spec.backendEvaluation.mainRisk}
- Secondary Risks: ${spec.backendEvaluation.secondaryRisks.join(', ') || 'keine'}
- Reduce Scope: ${String(spec.backendEvaluation.shouldReduceScope)}
- Increase Structure: ${String(spec.backendEvaluation.shouldIncreaseStructure)}
- Add Mini Steps: ${String(spec.backendEvaluation.shouldAddMiniSteps)}
- Suggest Deadline Shift: ${String(spec.backendEvaluation.shouldSuggestDeadlineShift)}
- Suggested Deadline Shift Days: ${spec.backendEvaluation.suggestedDeadlineShiftDays}

Aktueller Stand:
${spec.currentLevel}

Zielzustand:
${spec.targetOutcome}

Deadline:
${spec.targetDate}

Stärken:
${spec.strengths.join(', ') || 'keine klaren'}

Blocker:
${spec.blockers.join(', ') || 'keine klaren'}

Realismus:
${spec.realismScore}/100

Mindestplan:
- Minuten/Woche: ${spec.requiredMinutesPerWeek}
- Habits/Woche: ${spec.requiredHabitsPerWeek}
- Todos/Woche: ${spec.requiredTodosPerWeek}
- Fokusblöcke/Woche: ${spec.requiredFocusBlocksPerWeek}

Gib JSON mit diesem Format zurück:
{
  "realismVerdict": "string",
  "mainBottleneck": "string",
  "recommendations": ["string", "string", "string"],
  "milestones": ["string", "string", "string"],
  "scheduleAdvice": "string"
}
`.trim();
}