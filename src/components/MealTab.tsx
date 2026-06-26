import React, { useState } from "react";
import { MealEntry } from "../types";
import { Plus, Trash2, Calendar, Coffee, Sparkles } from "lucide-react";

interface MealTabProps {
  meals: MealEntry[];
  onAddMeal: (time: MealEntry["time"], content: string, date: string, hourMinute?: string) => Promise<void>;
  onDeleteMeal: (id: number) => Promise<void>;
  today: string;
}

export default function MealTab({ meals, onAddMeal, onDeleteMeal, today }: MealTabProps) {
  const [mealText, setMealText] = useState("");
  const [mealTime, setMealTime] = useState<MealEntry["time"]>("朝");
  const [dateInput, setDateInput] = useState(today);
  
  // Generate 30-minute interval choices
  const timeOptions = React.useMemo(() => {
    const opts: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hrStr = String(hour).padStart(2, "0");
      opts.push(`${hrStr}:00`);
      opts.push(`${hrStr}:30`);
    }
    return opts;
  }, []);

  const [hourMinute, setHourMinute] = useState(() => {
    const now = new Date();
    const currentMins = now.getMinutes();
    const roundedMins = currentMins < 15 ? "00" : currentMins < 45 ? "30" : "00";
    let hour = now.getHours();
    if (currentMins >= 45) {
      hour = (hour + 1) % 24;
    }
    return `${String(hour).padStart(2, "0")}:${roundedMins}`;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealText.trim()) return;
    await onAddMeal(mealTime, mealText.trim(), dateInput, hourMinute || undefined);
    setMealText("");
  };

  const selectedDateMeals = meals.filter(m => m.date === dateInput);
  const otherMeals = meals.filter(m => m.date !== dateInput);

  const badgeColors: Record<MealEntry["time"], string> = {
    朝: "bg-pink-50 text-pink-500 border-pink-200/60",
    昼: "bg-amber-50 text-amber-550 border-amber-200/50",
    夜: "bg-rose-50 text-rose-500 border-rose-200/50",
    間食: "bg-purple-50 text-purple-500 border-purple-200/50",
  };

  return (
    <div className="space-y-6">
      {/* Input section Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Coffee className="w-5 h-5 text-pink-400" />
          食事をやさしく個別記録 🍰
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">食事日</label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">時間 (30分刻み)</label>
              <select
                value={hourMinute}
                onChange={e => setHourMinute(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold font-mono cursor-pointer"
              >
                {timeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2.5 tracking-wider">食事の時間帯</label>
            <div className="flex gap-2">
              {(["朝", "昼", "夜", "間食"] as MealEntry["time"][]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMealTime(t)}
                  className={`flex-1 py-2 text-xs font-bold rounded-full border transition-all duration-250 ${
                    mealTime === t
                      ? "bg-gradient-to-r from-pink-400 to-rose-455 text-white border-transparent shadow-md shadow-pink-200"
                      : "bg-pink-50/20 text-slate-455 border-pink-100/60 hover:bg-pink-100/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2.5 tracking-wider">メニューや食べたもの</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="例：豆腐とわかめの味噌汁、ささみサラダ 🥗"
                value={mealText}
                onChange={e => setMealText(e.target.value)}
                className="flex-1 bg-pink-50/20 border border-pink-100 rounded-2xl px-4 py-2.5 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold"
              />
              <button
                type="submit"
                disabled={!mealText.trim()}
                className="bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl px-5 flex items-center justify-center gap-1 hover:brightness-105 active:scale-95 transition-all font-bold text-xs disabled:opacity-45 disabled:pointer-events-none shadow-md shadow-pink-200 shrink-0"
              >
                <Plus className="w-4 h-4" />
                追加 🎀
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Selected Day's Meals listing Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Sparkles className="w-4.5 h-4.5 text-pink-450 animate-pulse" />
          {dateInput === today ? "今日の食事リスト 🍽️" : `${dateInput.slice(5)} の食事リスト 🍽️`}
        </h3>
        {selectedDateMeals.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-pink-100 rounded-2xl bg-pink-50/10">
            この日の食事記録はまだありません。メニューを追加してみましょう 🍰
          </div>
        ) : (
          <div className="divide-y divide-pink-50">
            {selectedDateMeals.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badgeColors[m.time]}`}>
                    {m.time}
                  </span>
                  {m.hourMinute && (
                    <span className="text-[10px] text-slate-400/90 font-mono font-bold">
                      {m.hourMinute}
                    </span>
                  )}
                  <p className="text-xs text-slate-700 font-extrabold">{m.content}</p>
                </div>
                <button
                  onClick={() => onDeleteMeal(m.id)}
                  className="text-slate-300 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 transition-all duration-200"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical logs list Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Calendar className="w-5 h-5 text-pink-400" />
          その他の食事履歴 📅
        </h3>
        {otherMeals.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            他の日の食事記録はありません。
          </div>
        ) : (
          <div className="flow-root">
            <div className="-my-3 divide-y divide-pink-50 max-h-[300px] overflow-y-auto pr-1">
              {otherMeals.slice(0, 30).map(m => (
                <div key={m.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-0.5">
                      {m.date.slice(5) /* MM-DD */}
                    </span>
                    <span className={`text-[9px] scale-90 px-2 py-0.5 rounded-full font-bold border ${badgeColors[m.time]}`}>
                      {m.time}
                    </span>
                    {m.hourMinute && (
                      <span className="text-[9px] font-mono font-semibold text-slate-400">
                        {m.hourMinute}
                      </span>
                    )}
                    <span className="text-xs text-slate-600 font-bold">{m.content}</span>
                  </div>
                  <button
                    onClick={() => onDeleteMeal(m.id)}
                    className="text-slate-300 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
