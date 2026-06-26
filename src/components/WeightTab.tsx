import React, { useState } from "react";
import { WeightEntry, CheckupItem } from "../types";
import { CHECKUP_SCHEDULE, getRecommendedGain } from "../lib/pregnancyUtils";
import WeightChart from "./WeightChart";
import { Scale, History, CalendarDays } from "lucide-react";

interface WeightTabProps {
  weights: WeightEntry[];
  prePregnancyWeight: number;
  onAddWeight: (weight: number, date: string) => Promise<void>;
  nextCheckup: CheckupItem;
  daysToNext: number;
  currentGain: number;
  recGain: { min: number; max: number };
  weekInfo: { weeks: number; days: number; label: string };
  currentWeight: number;
}

export default function WeightTab({
  weights,
  prePregnancyWeight,
  onAddWeight,
  nextCheckup,
  daysToNext,
  currentGain,
  recGain,
  weekInfo,
  currentWeight,
}: WeightTabProps) {
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(weightInput);
    if (isNaN(parsed) || parsed <= 0) return;
    await onAddWeight(parsed, dateInput);
    setWeightInput("");
  };

  const getGainDeviationStatus = (gain: number, min: number, max: number) => {
    if (gain > max) return { text: "推奨値より多め 🍼", color: "text-rose-500 bg-rose-50 border-rose-100", emoji: "💝" };
    if (gain < min) return { text: "推奨値より少なめ 👶", color: "text-amber-500 bg-amber-50 border-amber-100/70", emoji: "🍼" };
    return { text: "とても順調です ✨", color: "text-pink-650 bg-pink-50 border-pink-100", emoji: "🌸" };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Current Week Target Weight Prominent Highlight */}
      <div className="bg-gradient-to-br from-pink-50 via-white to-pink-50/45 rounded-3xl p-6 shadow-xl shadow-pink-100/20 border border-pink-100 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none text-6xl">✨</div>
        <div className="flex items-center gap-2 mb-3.5">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800">
              いま（{weekInfo.weeks}週目 / {weekInfo.label}）の適正体重目安
            </h4>
            <p className="text-[10px] text-pink-400">
              検診日の値だけでなく、現在の週数における最新の推奨目安（国立成育医療研究センター準拠）
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-white/75 backdrop-blur-sm rounded-2xl p-4 border border-pink-100/40 relative z-10">
          <div>
            <span className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">妊娠前の体重</span>
            <span className="text-[13px] font-extrabold text-slate-700 font-mono">
              {prePregnancyWeight.toFixed(1)} <span className="text-[9px] font-medium text-slate-400">kg</span>
            </span>
          </div>

          <div>
            <span className="block text-[9px] uppercase font-bold text-pink-500 mb-0.5">現在の体重</span>
            <span className="text-[13px] font-extrabold text-pink-600 font-mono">
              {currentWeight.toFixed(1)} <span className="text-[9px] font-bold text-pink-400">kg</span>
              <span className="text-[9px] text-slate-400 font-medium ml-1">
                ({currentGain >= 0 ? "+" : ""}{currentGain.toFixed(1)}kg)
              </span>
            </span>
          </div>

          <div className="col-span-2 border-t border-dashed border-pink-100 pt-3 mt-1">
            <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
              {weekInfo.weeks}週目の適正体重（目標範囲）
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-extrabold text-slate-800 font-mono">
                {(prePregnancyWeight + recGain.min).toFixed(1)} 〜 {(prePregnancyWeight + recGain.max).toFixed(1)} <span className="text-[11px] font-bold">kg</span>
              </span>
              <span className="text-[9px] text-pink-500 font-bold bg-pink-100/50 px-1.5 py-0.5 rounded-md">
                (増加差: +{recGain.min.toFixed(1)}〜+{recGain.max.toFixed(1)}kg)
              </span>
            </div>
            
            {/* Deviation advice statement */}
            <div className="mt-2.5 text-[9.5px] leading-relaxed font-bold">
              <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                <span>判定結果:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] border ${
                  currentGain > recGain.max
                    ? "text-rose-500 bg-rose-50 border-rose-100"
                    : currentGain < recGain.min
                    ? "text-amber-600 bg-amber-50 border-amber-100/70"
                    : "text-emerald-600 bg-emerald-50 border-emerald-100/60"
                }`}>
                  {currentGain > recGain.max
                    ? "推奨の上限ラインよりも多めです 🍼"
                    : currentGain < recGain.min
                    ? "推奨の下限ラインよりも少なめです 👶"
                    : "ベストな推奨目標の適正範囲内です 🌸"}
                </span>
              </div>
              
              <div className="text-[10px] text-slate-500 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {currentGain > recGain.max ? (
                  <>
                    適正の上限まであと <span className="text-rose-500 font-bold">{(currentGain - recGain.max).toFixed(1)}kg</span> オーバーしています。30分単位の食事記録などをつけながら、無理のない軽いストレッチや食事量を調整してみましょう 🍃
                  </>
                ) : currentGain < recGain.min ? (
                  <>
                    適正の下限まであと <span className="text-amber-600 font-bold">{(recGain.min - currentGain).toFixed(1)}kg</span> 足りていません。赤ちゃんの健やかな成長のためにも、主食や良質なたんぱく質の摂取を少し多めに意識してみてくださいね ✨
                  </>
                ) : (
                  <>
                    現在、最も健やかでおすすめな推奨値（適正レンジ）をしっかりとキープできており、とても素晴らしい状態です。この調子で水分補給も忘れずに日々をお過ごしください 💖
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record weight input Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50 relative overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Scale className="w-5 h-5 text-pink-400" />
          現在の体重をふんわり記録
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">測定日</label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">体重</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  placeholder="例：56.4"
                  className="w-full bg-pink-50/20 border border-pink-100 rounded-2xl pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all text-slate-700 font-mono font-bold placeholder:text-slate-300"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-300">kg</span>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!weightInput.trim()}
            className="w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white font-extrabold text-xs py-3 rounded-2xl hover:brightness-105 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-pink-200/50"
          >
            この日の体重を記録する 🌸
          </button>
        </form>
      </div>

      {/* Embedded Chart Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          <CalendarDays className="w-5 h-5 text-pink-400" />
          体重の推移グラフ
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">
          国立成育医療研究センターの推奨目標範囲と、ママの実際の体重記録をマッピングしています。
        </p>
        <WeightChart weights={weights} prePregnancyWeight={prePregnancyWeight} />
      </div>

      {/* Target schedule List Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          <CalendarDays className="w-5 h-5 text-pink-400" />
          検診別 目標体重増加量目安
        </h3>
        <p className="text-[9px] text-slate-400 mb-4 leading-relaxed">
          出典：国立成育医療研究センター「妊娠中の体重増加曲線」推奨目標（普通体重 BMI 18.5〜25 向け）
        </p>

        <div className="space-y-2.5">
          {CHECKUP_SCHEDULE.map((c, i) => {
            // Find if there is a weight log on/before this checkout date
            const pastEntry = [...weights]
              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .find(w => w.date <= c.date);

            const actualGain = pastEntry ? pastEntry.weight - prePregnancyWeight : null;
            const onTrack = actualGain !== null && actualGain >= c.minGain && actualGain <= c.maxGain;
            const isNext = c.date === nextCheckup.date;

            return (
              <div
                key={i}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all duration-200 ${
                  isNext
                    ? "bg-[#fff7f9] border-pink-300 shadow-sm"
                    : "bg-[#fffbfe]/40 border-pink-100/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {isNext && (
                      <span className="text-[8px] font-extrabold bg-pink-400 text-white py-0.5 px-2 rounded-full uppercase tracking-wider font-sans shadow-sm">
                        次回
                      </span>
                    )}
                    <span className="font-bold text-slate-700">{c.date.slice(5) /* MM-DD */}</span>
                    <span className="text-[10px] text-pink-400 font-mono font-bold">{c.week}</span>
                  </div>
                  <div className="text-[10px] text-slate-400/90 font-medium">
                    推奨基準：+{c.minGain.toFixed(1)} 〜 +{c.maxGain.toFixed(1)} kg
                  </div>
                </div>

                <div className="text-right font-extrabold">
                  {actualGain !== null ? (
                    <div className="flex items-center gap-1">
                      <span className={onTrack ? "text-pink-500" : "text-rose-500"}>
                        +{actualGain.toFixed(1)} kg
                      </span>
                      <span>{onTrack ? "💖" : "⚠️"}</span>
                    </div>
                  ) : (
                    <span className="text-slate-300 font-normal">未記録</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History log listing Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <History className="w-5 h-5 text-pink-400" />
          直近の測定履歴
        </h3>

        {weights.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-pink-100 rounded-2xl bg-pink-50/10">
            体重記録はまだありません 🌸
          </div>
        ) : (
          <div className="divide-y divide-pink-50 max-h-[300px] overflow-y-auto pr-1">
            {[...weights]
              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((w, idx) => {
                const gain = w.weight - prePregnancyWeight;
                const weekNum = parseInt(w.weekLabel) || 0;
                const rec = getRecommendedGain(weekNum);
                const status = getGainDeviationStatus(gain, rec.min, rec.max);

                return (
                  <div key={idx} className="flex justify-between items-center py-3.1">
                    <div>
                      <div className="font-extrabold text-slate-700 text-xs font-mono">
                        {w.weight.toFixed(1)} kg
                        <span className="text-[10px] text-slate-400 font-semibold font-mono ml-2">
                          ({w.date} • {w.weekLabel})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        基準量: +{rec.min.toFixed(1)}〜+{rec.max.toFixed(1)} kg
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${status.color}`}>
                        {status.text} (+{gain.toFixed(1)}kg)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
