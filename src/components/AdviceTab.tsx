import React from "react";
import { Sparkles, Activity, Heart, RefreshCw, AlertCircle } from "lucide-react";
import { AIAdviceContext } from "../types";

interface AdviceTabProps {
  advice: string;
  loading: boolean;
  onFetchAdvice: () => Promise<void>;
  contextData: AIAdviceContext;
  prePregnancyWeight: number;
  prePregnancyBmi: number;
}

export default function AdviceTab({
  advice,
  loading,
  onFetchAdvice,
  contextData,
  prePregnancyWeight,
  prePregnancyBmi,
}: AdviceTabProps) {
  return (
    <div className="space-y-6 font-sans">
      {/* AI Advice Request Action Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.55">
          <Sparkles className="w-5 h-5 text-pink-450 animate-pulse" />
          パーソナル妊婦AIアドバイス 🌸
        </h3>
        <p className="text-xs text-slate-400/95 mb-5 leading-relaxed font-semibold">
          今日の体重推移、そして本日召し上がった「食事リスト」、行った「運動内容」をもとに、お腹の赤ちゃんとご自身の最適な健康管理に向けて助産師・管理栄養士さながらの優しくあたたかい個別お手紙を生成します。 👶✨
        </p>

        <button
          onClick={onFetchAdvice}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 hover:brightness-105 hover:shadow-lg text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-pink-200/55"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              AIアドバイスを編んでいます... 🌸
            </>
          ) : (
            <>
              <Heart className="w-4 h-4 fill-white animate-pulse text-white" />
              個別のレター（アドバイス）をもらう ✨
            </>
          )}
        </button>
      </div>

      {/* AI Advice Display Card */}
      {advice && (
        <div className="bg-[#fff9fa] rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-100 transition-all duration-300">
          <h3 className="text-sm font-bold text-pink-650 mb-4 flex items-center gap-1.5 border-b border-pink-100 pb-2.5">
            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            AIアドバイザーからのふんわり個別レター 💌
          </h3>
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line space-y-2.5 font-bold">
            {advice}
          </div>
          <div className="mt-4 flex items-center gap-1.5 py-2 px-3 bg-white rounded-2xl border border-pink-100/60">
            <AlertCircle className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span className="text-[10.5px] text-pink-400/90 leading-relaxed font-semibold">※こちらはAIの個別アドバイスであり、医療的な確定診断に代わるものではありません。</span>
          </div>
        </div>
      )}

      {/* Summary Matrix Grid Dashboard */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-pink-100/30 border border-pink-50/50">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Activity className="w-5 h-5 text-pink-400" />
          現在の状況サマリー 📊
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-pink-50/15 p-3 rounded-2xl border border-pink-100/40">
            <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-1">妊娠前体重</span>
            <span className="text-sm font-extrabold text-[#ec4899] font-mono">{prePregnancyWeight} kg</span>
          </div>
          
          <div className="bg-pink-50/15 p-3 rounded-2xl border border-pink-100/40">
            <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-1">妊娠前BMI</span>
            <span className="text-sm font-extrabold text-[#ec4899] font-mono">{prePregnancyBmi.toFixed(1)}</span>
          </div>
 
          <div className="bg-pink-50/15 p-3 rounded-2xl border border-pink-100/40">
            <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-1">現在体重</span>
            <span className="text-sm font-extrabold text-slate-700 font-mono">{contextData.現在体重 ? `${contextData.現在体重} kg` : "未登録"}</span>
          </div>
 
          <div className="bg-pink-50/15 p-3 rounded-2xl border border-pink-100/40">
            <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-1">体重増加量</span>
            <span className="text-sm font-extrabold text-pink-550 font-mono">{contextData.体重増加量 || "+0.0kg"}</span>
          </div>
 
          <div className="bg-pink-50/10 p-3 rounded-2xl border border-pink-100/40 col-span-2">
            <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-1">現在の推奨増加範囲（成育目標）</span>
            <span className="text-xs font-bold text-pink-600 font-mono">{contextData.現在の推奨増加範囲 || "推奨：10〜13kg"}</span>
          </div>
 
          <div className="bg-pink-50/10 p-3 rounded-2xl border border-pink-100/40 col-span-2">
            <span className="block text-[9px] text-pink-400 uppercase tracking-widest font-bold mb-1">次回検診目標（推奨範囲）</span>
            <span className="text-xs font-bold text-slate-700 font-mono">{contextData.次回検診 || "未定義"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
