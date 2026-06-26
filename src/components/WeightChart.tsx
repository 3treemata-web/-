import React from "react";
import { WeightEntry } from "../types";
import { CHECKUP_SCHEDULE, WEEKLY_GUIDE } from "../lib/pregnancyUtils";

interface WeightChartProps {
  weights: WeightEntry[];
  prePregnancyWeight: number;
}

export default function WeightChart({ weights, prePregnancyWeight }: WeightChartProps) {
  const W = 450;
  const H = 220;
  const PL = 42;
  const PR = 16;
  const PT = 16;
  const PB = 35;
  const gW = W - PL - PR;
  const gH = H - PT - PB;

  if (weights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-pink-50/10 rounded-2xl border border-dashed border-pink-200 text-pink-400 font-sans">
        <span className="text-xs font-bold">データがありません。体重を記録すると可愛いグラフが表示されます。🌸</span>
      </div>
    );
  }

  // Raw weight ranges for scaling
  const allW = weights.map(w => w.weight);
  const minW = Math.min(...allW, prePregnancyWeight + WEEKLY_GUIDE[0][1]) - 1.0;
  const maxW = Math.max(...allW, prePregnancyWeight + 13) + 1.0;

  // X axis scaling by dates
  const dates = weights.map(w => new Date(w.date).getTime());
  const checkupDates = CHECKUP_SCHEDULE.map(c => new Date(c.date).getTime());
  const allDates = [...dates, ...checkupDates];
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const dateDiffRange = maxDate - minDate || 1;

  // Scaling helpers
  const xScale = (ts: number) => PL + ((ts - minDate) / dateDiffRange) * gW;
  const yScale = (v: number) => PT + gH - ((v - minW) / (maxW - minW || 1)) * gH;

  // NCCHD recommended gain guidelines curves
  const minLine = CHECKUP_SCHEDULE.map(c => ({
    x: xScale(new Date(c.date).getTime()),
    y: yScale(prePregnancyWeight + c.minGain)
  }));
  const maxLine = CHECKUP_SCHEDULE.map(c => ({
    x: xScale(new Date(c.date).getTime()),
    y: yScale(prePregnancyWeight + c.maxGain)
  }));

  // Create SVG drawing path statements
  const toPath = (pts: { x: number; y: number }[]) => 
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  // Create a closed polygon shaded area for the comfortable recommended weight gain region
  const areaPath = maxLine.length > 0 
    ? `${toPath(maxLine)} L ${minLine[minLine.length - 1].x.toFixed(1)} ${minLine[minLine.length - 1].y.toFixed(1)} ${[...minLine].reverse().map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")} Z`
    : "";

  // actual registered weight line
  const sortedWeights = [...weights].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weightPath = sortedWeights.map((w, i) => {
    const x = xScale(new Date(w.date).getTime());
    const y = yScale(w.weight);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="w-full bg-[#fdfafb] p-4 rounded-2xl border border-pink-100 shadow-inner">
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[320px] overflow-visible">
          {/* Grid lines & Y tick text labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
            const y = PT + gH * (1 - t);
            const v = (minW + t * (maxW - minW)).toFixed(1);
            return (
              <g key={idx}>
                <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="rgba(244, 114, 182, 0.08)" strokeWidth="1" />
                <text x={PL - 6} y={y + 3} textAnchor="end" className="fill-pink-400 font-mono text-[9px] font-bold">{v}kg</text>
              </g>
            );
          })}

          {/* Shaded recommend region */}
          {areaPath && <path d={areaPath} fill="rgba(251, 113, 133, 0.05)" stroke="rgba(251, 113, 133, 0.12)" strokeWidth="1" />}

          {/* Recommendation Upper Target Line */}
          {maxLine.length > 0 && (
            <path d={toPath(maxLine)} fill="none" stroke="rgba(244, 114, 182, 0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
          )}
          {/* Recommendation Lower Target Line */}
          {minLine.length > 0 && (
            <path d={toPath(minLine)} fill="none" stroke="rgba(244, 114, 182, 0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
          )}

          {/* Vertical Checkup Dates Grid */}
          {CHECKUP_SCHEDULE.map((c, i) => {
            const x = xScale(new Date(c.date).getTime());
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={PT} y2={PT + gH} stroke="rgba(244, 114, 182, 0.08)" strokeWidth="1" strokeDasharray="1 4" />
                {/* Checkup label on bottom of chart */}
                <text x={x} y={PT + gH + 14} textAnchor="middle" className="fill-pink-500 font-sans text-[8px] font-bold">
                  {c.date.slice(5) /* MM-DD */}
                </text>
                <text x={x} y={PT + gH + 24} textAnchor="middle" className="fill-slate-400 font-sans text-[7px] font-semibold">
                  {c.week}
                </text>
              </g>
            );
          })}

          {/* Weight trend visual line */}
          {weightPath && (
            <path d={weightPath} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Weight dots on specific dates */}
          {sortedWeights.map((w, i) => {
            const x = xScale(new Date(w.date).getTime());
            const y = yScale(w.weight);
            return (
              <g key={i} className="group cursor-pointer">
                <circle cx={x} cy={y} r="5" className="fill-pink-500 stroke-white stroke-[2] shadow-sm" />
                <title>{`${w.date} (${w.weekLabel}): ${w.weight}kg`}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[9px] text-slate-400 font-sans font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-rose-450/5 border border-pink-200/50 rounded"></span>
          <span>推奨増加範囲（成育目標）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-[#ec4899]"></span>
          <span>プレママの体重推移</span>
        </div>
      </div>
    </div>
  );
}
