import { CheckupItem, WeekInfo, WeightEntry } from "../types";

// Dynamic defaults that user can also adjust
export const DEFAULT_PROFILE = {
  prePregnancyWeight: 55,
  height: 164,
  lmp: "2026-03-12" // YYYY-MM-DD
};

// National Center for Child Health and Development checkup guidelines
// (成育医療研究センターガイドライン: BMI 18.5-25 普通体重向け目標増加量)
export const CHECKUP_SCHEDULE: CheckupItem[] = [
  { date: "2026-07-18", week: "18w2d", minGain: 2.5, maxGain: 4.3 },
  { date: "2026-08-15", week: "22w2d", minGain: 4.0, maxGain: 6.1 },
  { date: "2026-09-12", week: "26w2d", minGain: 5.5, maxGain: 7.9 },
  { date: "2026-10-10", week: "30w2d", minGain: 6.4, maxGain: 9.1 },
  { date: "2026-11-07", week: "34w2d", minGain: 7.8, maxGain: 10.5 },
  { date: "2026-12-05", week: "38w2d", minGain: 9.2, maxGain: 11.9 },
];

export const WEEKLY_GUIDE = [
  [10, 0.5, 1.5], [12, 0.8, 2.0], [14, 1.2, 2.7], [16, 1.8, 3.5],
  [18, 2.5, 4.3], [20, 3.2, 5.2], [22, 4.0, 6.1], [24, 4.8, 7.0],
  [26, 5.5, 7.9], [28, 6.0, 8.5], [30, 6.4, 9.1], [32, 7.0, 9.8],
  [34, 7.8, 10.5], [36, 8.5, 11.2], [38, 9.2, 11.9], [40, 10.0, 13.0],
];

export function getRecommendedGain(weeks: number) {
  for (let i = 0; i < WEEKLY_GUIDE.length - 1; i++) {
    if (weeks >= WEEKLY_GUIDE[i][0] && weeks < WEEKLY_GUIDE[i + 1][0]) {
      const t = (weeks - WEEKLY_GUIDE[i][0]) / (WEEKLY_GUIDE[i + 1][0] - WEEKLY_GUIDE[i][0]);
      return {
        min: parseFloat((WEEKLY_GUIDE[i][1] + t * (WEEKLY_GUIDE[i + 1][1] - WEEKLY_GUIDE[i][1])).toFixed(1)),
        max: parseFloat((WEEKLY_GUIDE[i][2] + t * (WEEKLY_GUIDE[i + 1][2] - WEEKLY_GUIDE[i][2])).toFixed(1))
      };
    }
  }
  return { min: 10.0, max: 13.0 };
}

export function getCurrentWeekInfo(lmpDateStr: string): WeekInfo {
  const lmp = new Date(lmpDateStr);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  return {
    weeks: Math.max(0, weeks),
    days: Math.max(0, days),
    label: `${Math.max(0, weeks)}w${Math.max(0, days)}d`
  };
}

export function getWeekLabel(dateStr: string, lmpDateStr: string): string {
  const d = new Date(dateStr);
  const lmp = new Date(lmpDateStr);
  const diffDays = Math.round((d.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
  const w = Math.floor(diffDays / 7);
  const day = diffDays % 7;
  return `${w}w${day}d`;
}

export function getNextCheckup(todayStr: string): CheckupItem {
  // Finds the first checkup date that is >= todayStr, or the last one if none are in the future
  const found = CHECKUP_SCHEDULE.find(c => c.date >= todayStr);
  return found || CHECKUP_SCHEDULE[CHECKUP_SCHEDULE.length - 1];
}

// Local Storage Wrappers
export const STORAGE_KEYS = {
  weights: "pg_weights",
  meals: "pg_meals",
  exercises: "pg_exercises",
  profile: "pg_profile",
  memos: "pg_memos",
  chats: "pg_chats"
};

export async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    // Check if window.storage exists (for sandbox wrappers), or fallback to localStorage
    const storageObj = (window as any).storage;
    if (storageObj && typeof storageObj.get === "function") {
      try {
        const r = await storageObj.get(key);
        return r ? JSON.parse(r.value) : defaultValue;
      } catch (innerErr) {
        console.warn(`container storage.get failed for key ${key}, falling back to localStorage:`, innerErr);
      }
    }
    
    // Standard browser storage
    const localVal = localStorage.getItem(key);
    return localVal ? JSON.parse(localVal) : defaultValue;
  } catch (error) {
    console.error(`Error loading storage data for key ${key}:`, error);
    return defaultValue;
  }
}

export async function saveData<T>(key: string, value: T): Promise<void> {
  try {
    const storageObj = (window as any).storage;
    if (storageObj && typeof storageObj.set === "function") {
      try {
        await storageObj.set(key, JSON.stringify(value));
        return;
      } catch (innerErr) {
        console.warn(`container storage.set failed for key ${key}, falling back to localStorage:`, innerErr);
      }
    }
    
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving storage data for key ${key}:`, error);
  }
}
