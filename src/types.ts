export interface WeightEntry {
  date: string;
  weight: number;
  weekLabel: string;
}

export interface MealEntry {
  id: number;
  date: string;
  time: "朝" | "昼" | "夜" | "間食";
  content: string;
  hourMinute?: string;
}

export interface ExerciseEntry {
  id: number;
  date: string;
  content: string;
  mins: number;
}

export interface CheckupItem {
  date: string;
  week: string;
  minGain: number;
  maxGain: number;
}

export interface WeekInfo {
  weeks: number;
  days: number;
  label: string;
}

export interface AIAdviceContext {
  現在週数: string;
  現在体重: number;
  体重増加量: string;
  現在の推奨増加範囲: string;
  次回検診: string;
  今日の食事: string[];
  今日の運動: string[];
}

export interface MemoEntry {
  id: number;
  date: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: number;
}
