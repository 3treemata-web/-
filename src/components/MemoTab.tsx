import React, { useState } from "react";
import { MemoEntry } from "../types";
import { Plus, Trash2, CalendarDays, NotebookPen, Sparkles } from "lucide-react";

interface MemoTabProps {
  memos: MemoEntry[];
  onAddMemo: (content: string, date: string) => Promise<void>;
  onDeleteMemo: (id: number) => Promise<void>;
  today: string;
}

export default function MemoTab({ memos, onAddMemo, onDeleteMemo, today }: MemoTabProps) {
  const [memoText, setMemoText] = useState("");
  const [dateInput, setDateInput] = useState(today);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoText.trim()) return;
    await onAddMemo(memoText.trim(), dateInput);
    setMemoText("");
  };

  const selectedDateMemos = memos.filter(m => m.date === dateInput);
  const otherMemos = memos.filter(m => m.date !== dateInput);

  return (
    <div className="space-y-6 font-sans">
      {/* Input section Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <NotebookPen className="w-5 h-5 text-pink-400" />
          今日の出来事や体調メモを記録 📝
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">
          食事や運動以外の、お腹の張り、気分、購入したもの、通院記録など、自由なメモを残せます。
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">メモの日付</label>
            <input
              type="date"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">メモの内容</label>
            <textarea
              rows={3}
              placeholder="例：今日はお腹も張らず、赤ちゃんがポコポコ動いているような胎動（？）を感じたかも！ゆっくり湯船に浸かりました。🛀"
              value={memoText}
              onChange={e => setMemoText(e.target.value)}
              className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-4 py-3 text-xs placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-medium leading-relaxed"
              style={{ contentVisibility: 'auto' }} // performance
            />
          </div>

          <button
            type="submit"
            disabled={!memoText.trim()}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl py-3 flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-[0.98] transition-all font-extrabold text-xs disabled:opacity-45 disabled:pointer-events-none shadow-md shadow-pink-200"
          >
            <Plus className="w-4 h-4" />
            メモを記録する 🌸
          </button>
        </form>
      </div>

      {/* Selected Day's Memos listing Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Sparkles className="w-4.5 h-4.5 text-pink-400 animate-pulse" />
          {dateInput === today ? "今日のメモ一覧 📌" : `${dateInput.slice(5)} のメモ一覧 📌`}
        </h3>
        {selectedDateMemos.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-pink-100 rounded-2xl bg-pink-50/10">
            この日の自由メモはまだありません。今日の体調や気分を記録してみましょう 🌻
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDateMemos.map(m => (
              <div key={m.id} className="bg-pink-50/10 border border-pink-150 rounded-2xl p-4 flex justify-between items-start gap-3 group relative hover:shadow-sm">
                <div className="flex-1">
                  <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{m.content}</p>
                </div>
                <button
                  onClick={() => onDeleteMemo(m.id)}
                  className="text-slate-300 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 transition-all shrink-0"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History listing Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <CalendarDays className="w-5 h-5 text-pink-400" />
          過去のメモ履歴 📅
        </h3>
        {otherMemos.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            他の日のメモ記録はありません。
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {otherMemos.slice(0, 30).map(m => (
              <div key={m.id} className="bg-slate-50/40 border border-slate-100 rounded-2xl p-3.5 flex justify-between items-start gap-2.5 group">
                <div className="flex-1">
                  <span className="inline-block text-[9px] font-mono font-bold text-slate-450 bg-slate-100/70 rounded px-1.5 py-0.5 mb-1.5">
                    {m.date}
                  </span>
                  <p className="text-[11px] text-slate-650 leading-relaxed font-normal whitespace-pre-wrap">{m.content}</p>
                </div>
                <button
                  onClick={() => onDeleteMemo(m.id)}
                  className="text-slate-300 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
