import React, { useState } from "react";
import { ExerciseEntry } from "../types";
import { Plus, Trash2, Calendar, Smile, Dumbbell } from "lucide-react";

interface ExerciseTabProps {
  exercises: ExerciseEntry[];
  onAddExercise: (content: string, mins: number, date: string) => Promise<void>;
  onDeleteExercise: (id: number) => Promise<void>;
  today: string;
}

export default function ExerciseTab({ exercises, onAddExercise, onDeleteExercise, today }: ExerciseTabProps) {
  const [exerciseText, setExerciseText] = useState("");
  const [exerciseMins, setExerciseMins] = useState("");
  const [dateInput, setDateInput] = useState(today);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseText.trim()) return;
    const parsedMins = parseInt(exerciseMins) || 0;
    await onAddExercise(exerciseText.trim(), parsedMins, dateInput);
    setExerciseText("");
    setExerciseMins("");
  };

  const selectedDateExercises = exercises.filter(e => e.date === dateInput);
  const otherExercises = exercises.filter(e => e.date !== dateInput);

  const totalMinSelected = selectedDateExercises.reduce((acc, curr) => acc + curr.mins, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Exercise Input Form Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Dumbbell className="w-5 h-5 text-pink-400" />
          運動をやさしく個別記録 👟
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">運動日</label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2.5 tracking-wider">行った運動やストレッチ</label>
            <input
              type="text"
              placeholder="例：ママヨガ、ご近所おさんぽ、のびのびストレッチ 🧘‍♀️"
              value={exerciseText}
              onChange={e => setExerciseText(e.target.value)}
              className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-4 py-2.5 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                placeholder="運動時間 (分)"
                min="0"
                value={exerciseMins}
                onChange={e => setExerciseMins(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-mono font-bold placeholder:text-slate-300"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-300">分</span>
            </div>
            <button
              type="submit"
              disabled={!exerciseText.trim()}
              className="bg-gradient-to-r from-pink-400 to-rose-450 text-white font-extrabold text-xs rounded-2xl px-6 py-2.5 hover:brightness-105 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-pink-200/50"
            >
              追加 🎀
            </button>
          </div>
        </form>
      </div>

      {/* Selected Day's exercise display */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Smile className="w-5 h-5 text-pink-400 animate-pulse" />
            {dateInput === today ? "今日の運動リスト 👟" : `${dateInput.slice(5)} の運動リスト 👟`}
          </h3>
          {totalMinSelected > 0 && (
            <span className="text-[10px] bg-pink-100 text-pink-650 border border-pink-200/50 font-bold px-2.5 py-0.5 rounded-full shadow-sm">
              合計 {totalMinSelected} 分
            </span>
          )}
        </div>

        {selectedDateExercises.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-pink-100 rounded-2xl bg-pink-50/10">
            この日の運動記録はまだありません。気持ちよく体を動かしてみませんか？✨
          </div>
        ) : (
          <div className="divide-y divide-pink-50">
            {selectedDateExercises.map(e => (
              <div key={e.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse shadow-sm shadow-pink-200"></span>
                  <div>
                    <p className="text-xs text-slate-700 font-extrabold">{e.content}</p>
                    {e.mins > 0 && <span className="text-[10px] text-pink-500 font-mono font-bold">{e.mins}分</span>}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteExercise(e.id)}
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

      {/* Historical Exercise list */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Calendar className="w-5 h-5 text-pink-400" />
          その他の運動履歴 📅
        </h3>
        
        {otherExercises.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            他の日の運動記録はありません。
          </div>
        ) : (
          <div className="flow-root">
            <div className="-my-3 divide-y divide-pink-50 max-h-[300px] overflow-y-auto pr-1">
              {otherExercises.slice(0, 30).map(e => (
                <div key={e.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {e.date.slice(5) /* MM-DD */}
                    </span>
                    <span className="text-xs text-slate-600 font-bold">{e.content}</span>
                    {e.mins > 0 && (
                      <span className="text-[9px] bg-pink-50 text-pink-500 border border-pink-100/60 px-1.5 py-0.2 rounded font-mono font-bold scale-90">
                        {e.mins}分
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteExercise(e.id)}
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
