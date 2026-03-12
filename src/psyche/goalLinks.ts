import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalLinkEntry, GoalLinkMap } from './types';

const GOAL_LINKS_KEY = 'kalendulu:psyche:goal-links:v1';

export async function loadGoalLinks(): Promise<GoalLinkMap> {
  try {
    const raw = await AsyncStorage.getItem(GOAL_LINKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as GoalLinkMap) : {};
  } catch {
    return {};
  }
}

export async function saveGoalLinks(map: GoalLinkMap) {
  try {
    await AsyncStorage.setItem(GOAL_LINKS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function saveGoalLinkEntry(entry: GoalLinkEntry) {
  const current = await loadGoalLinks();
  current[entry.goalId] = entry;
  await saveGoalLinks(current);
}

export async function removeGoalLinkEntry(goalId: string) {
  const current = await loadGoalLinks();
  delete current[goalId];
  await saveGoalLinks(current);
}