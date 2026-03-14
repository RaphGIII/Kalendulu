import {
  GoalAnswerMap,
  GoalRefinementResponse,
  PsycheGoal,
  UserPlanningProfile,
} from './types';

const API_URL = process.env.EXPO_PUBLIC_PLANNER_API_URL;
const APP_SECRET = process.env.EXPO_PUBLIC_APP_SHARED_SECRET;

type RefinementRequest = {
  goal: string;
  pastGoals: PsycheGoal[];
  profile: UserPlanningProfile;
  existingAnswers?: GoalAnswerMap;
};

function isGoalQuestionType(value: unknown) {
  return value === 'text' || value === 'single_choice' || value === 'multi_choice' || value === 'long_text';
}

function isGoalRefinementResponse(value: any): value is GoalRefinementResponse {
  return (
    value &&
    typeof value.goalLabel === 'string' &&
    typeof value.goalType === 'string' &&
    Array.isArray(value.questions) &&
    value.questions.every((q: any) => (
      q &&
      typeof q.id === 'string' &&
      typeof q.title === 'string' &&
      isGoalQuestionType(q.type) &&
      typeof q.required === 'boolean'
    ))
  );
}

export async function fetchGoalRefinement(
  input: RefinementRequest,
): Promise<GoalRefinementResponse> {
  if (!API_URL) {
    throw new Error('Planner API URL missing');
  }

  const res = await fetch(`${API_URL}/goal/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_SECRET ? { 'X-App-Secret': APP_SECRET } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Goal refinement failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (!isGoalRefinementResponse(data)) {
    throw new Error('Invalid goal refinement response');
  }

  return data;
}