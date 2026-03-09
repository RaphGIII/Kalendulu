import {
  GoalAnswerMap,
  GoalRefinementResponse,
  PsycheGoal,
  UserPlanningProfile,
} from './types';

const API_URL = process.env.EXPO_PUBLIC_PLANNER_API_URL;

type RefinementRequest = {
  goal: string;
  pastGoals: PsycheGoal[];
  profile: UserPlanningProfile;
  existingAnswers?: GoalAnswerMap;
};

function isGoalRefinementResponse(value: any): value is GoalRefinementResponse {
  return (
    value &&
    typeof value.goalLabel === 'string' &&
    typeof value.goalType === 'string' &&
    Array.isArray(value.questions)
  );
}

export async function fetchGoalRefinement(
  input: RefinementRequest
): Promise<GoalRefinementResponse> {
  if (!API_URL) {
    throw new Error('Planner API URL missing');
  }

  const res = await fetch(`${API_URL}/goal/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Goal refinement failed: ${res.status}`);
  }

  const data = await res.json();

  if (!isGoalRefinementResponse(data)) {
    throw new Error('Invalid goal refinement response');
  }

  return data;
}