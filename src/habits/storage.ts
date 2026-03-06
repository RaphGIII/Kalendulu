import AsyncStorage from '@react-native-async-storage/async-storage';
import { HabitState } from './types';

const KEY = 'kalendulu:habits:v1';

export async function loadHabitsState(): Promise<HabitState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HabitState;
  } catch {
    return null;
  }
}

export async function saveHabitsState(state: HabitState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}