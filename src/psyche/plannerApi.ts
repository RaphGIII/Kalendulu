import {
  GoalAnswerMap,
  MindsetProfile,
  PlannerBundle,
  PsycheGoal,
  PsycheSignals,
  UserPlanningProfile,
} from './types';
import type { FreeSlot } from './buildFreeSlots';

const API_URL = process.env.EXPO_PUBLIC_PLANNER_API_URL;

type PlannerApiRequest = {
  goals: PsycheGoal[];
  profile: MindsetProfile;
  signals: PsycheSignals;
  freeSlots: FreeSlot[];
  answers?: GoalAnswerMap;
  userPlanningProfile?: UserPlanningProfile;
};

function isPlannerBundle(value: any): value is PlannerBundle {
  return (
    value &&
    value.primary &&
    value.primary.todo &&
    typeof value.primary.todo.title === 'string' &&
    typeof value.primary.todo.reason === 'string' &&
    value.primary.habit &&
    typeof value.primary.habit.title === 'string' &&
    typeof value.primary.habit.reason === 'string' &&
    value.primary.calendar &&
    typeof value.primary.calendar.title === 'string' &&
    typeof value.primary.calendar.start === 'string' &&
    typeof value.primary.calendar.end === 'string' &&
    typeof value.primary.calendar.reason === 'string' &&
    Array.isArray(value.primary.routines) &&
    Array.isArray(value.alternatives)
  );
}

export async function fetchPlannerBundle(
  input: PlannerApiRequest
): Promise<PlannerBundle> {
  if (!API_URL) {
    throw new Error('Planner API URL missing');
  }

  const res = await fetch(`${API_URL}/planner/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Planner API failed: ${res.status}`);
  }

  const data = await res.json();

  if (!isPlannerBundle(data)) {
    throw new Error('Invalid planner response');
  }

  return data;
}