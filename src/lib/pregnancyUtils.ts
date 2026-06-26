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
  { date: "2026-07-18", week: "18w2d", minGain: 1.0, maxGain: 3.7 },
  { date: "2026-08-15", week: "22w2d", minGain: 2.2, maxGain: 5.3 },
  { date: "2026-09-12", week: "26w2d", minGain: 3.3, maxGain: 6.8 },
  { date: "2026-10-10", week: "30w2d", minGain: 5.0, maxGain: 8.5 },
  { date: "2026-11-07", week: "34w2d", minGain: 6.8, maxGain: 10.3 },
  { date: "2026-12-05", week: "38w2d", minGain: 9.0, maxGain: 12.5 },
];

export const WEEKLY_GUIDE = [
  [5,  -0.5, 0.5],
  [8,  -0.3, 1.0],
  [10,  0.0, 1.5],
  [12,  0.2, 2.0],
  [14,  0.4, 2.4],
  [15,  0.5, 2.8],
  [18,  1.0, 3.5],
  [20,  1.5, 4.5],
  [22,  2.2, 5.3],
  [25,  3.0, 6.5],
  [28,  4.2, 7.6],
  [30,  5.0, 8.5],
  [32,  6.0, 9.5],
  [35,  7.5, 11.0],
  [38,  9.0, 12.5],
  [40,  10.0, 13.0],
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
    const storageObj = (window as any).storage;
    if (storageObj && typeof storageObj.get === "function") {
      try {
        const r = await storageObj.get(key);
        return r ? JSON.parse(r.value) : defaultValue;
      } catch (innerErr) {
        console.warn(`container storage.get failed for key ${key}, falling back to localStorage:`, innerErr);
      }
    }
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
