import AsyncStorage from '@react-native-async-storage/async-storage';
import { PsycheDailySnapshot, PsycheGoal, PsycheSettings } from './types';

const SETTINGS_KEY = 'kalendulu:psyche:settings:v1';
const HISTORY_KEY = 'kalendulu:psyche:history:v1';
const GOALS_KEY = 'kalendulu:psyche:goals:v1';

export async function loadPsycheSettings(): Promise<PsycheSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PsycheSettings;
  } catch {
    return null;
  }
}

export async function savePsycheSettings(s: PsycheSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export async function loadPsycheHistory(): Promise<PsycheDailySnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PsycheDailySnapshot[];
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
    return JSON.parse(raw) as PsycheGoal[];
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