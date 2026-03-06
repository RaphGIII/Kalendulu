import AsyncStorage from '@react-native-async-storage/async-storage';
import { PsycheDailySnapshot, PsycheSettings } from './types';

const SETTINGS_KEY = 'kalendulu:psyche:settings:v1';
const HISTORY_KEY = 'kalendulu:psyche:history:v1';

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