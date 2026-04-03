import React from "react";

const SCORE_COLORS = {
  green: { stroke: "#22c55e", text: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  yellow: { stroke: "#eab308", text: "#eab308", bg: "rgba(234,179,8,0.1)" },
  red: { stroke: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

function Tooltip({ text, children }) {
  return (
    <span className="group tooltip-wrapper cursor-help">
      {children}
      <span className="tooltip-icon">?</span>
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

function ScoreRow({ label, score, weight, tooltip }) {
  const pct = Math.round(score);
  const color = pct <= 30 ? "#22c55e" : pct <= 60 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-36 text-xs text-slate-400 flex-shrink-0">
        <Tooltip text={tooltip}>{label}</Tooltip>
      </div>
      <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-10 text-right text-xs font-mono" style={{ color }}>{pct}</div>
      <div className="w-8 text-right text-xs text-slate-500">{weight}</div>
    </div>
  );
}

export default function OvervaluationGauge({ valuation_score }) {
  const { score, label, color, breakdown } = valuation_score;
  const c = SCORE_COLORS[color] || SCORE_COLORS.yellow;

  // SVG arc gauge (180° semicircle)
  const R = 80;
  const CX = 100;
  const CY = 100;
  const startAngle = -180;
  const endAngle = 0;
  const scoreAngle = startAngle + (score / 100) * 180;

  function polarToXY(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const trackStart = polarToXY(CX, CY, R, startAngle);
  const trackEnd = polarToXY(CX, CY, R, endAngle);
  const fillEnd = polarToXY(CX, CY, R, scoreAngle);
  const needleTip = polarToXY(CX, CY, R - 10, scoreAngle);

  return (
    <div className="flex flex-col items-center">
      {/* Gauge SVG */}
      <div className="relative w-52 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
          {/* Track */}
          <path
            d={`M ${trackStart.x} ${trackStart.y} A ${R} ${R} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Zone segments */}
          {[
            { from: -180, to: -126, color: "#22c55e" },
            { from: -126, to: -72, color: "#86efac" },
            { from: -72, to: -36, color: "#eab308" },
            { from: -36, to: 0, color: "#ef4444" },
          ].map((seg, i) => {
            const s = polarToXY(CX, CY, R, seg.from);
            const e = polarToXY(CX, CY, R, seg.to);
            const large = seg.to - seg.from > 180 ? 1 : 0;
            return (
              <path key={i}
                d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`}
                fill="none" stroke={seg.color} strokeWidth="14"
                strokeLinecap="butt" opacity="0.25"
              />
            );
          })}
          {/* Fill arc */}
          {score > 0 && (
            <path
              d={`M ${trackStart.x} ${trackStart.y} A ${R} ${R} 0 ${score > 50 ? 1 : 0} 1 ${fillEnd.x} ${fillEnd.y}`}
              fill="none"
              stroke={c.stroke}
              strokeWidth="14"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${c.stroke})` }}
            />
          )}
          {/* Needle */}
          <line
            x1={CX} y1={CY}
            x2={needleTip.x} y2={needleTip.y}
            stroke="white" strokeWidth="2.5" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.5))" }}
          />
          <circle cx={CX} cy={CY} r="5" fill="white" opacity="0.9" />
          {/* Labels */}
          <text x="18" y="108" fill="#22c55e" fontSize="9" fontWeight="600">0</text>
          <text x="90" y="18" fill="#eab308" fontSize="9" fontWeight="600" textAnchor="middle">50</text>
          <text x="178" y="108" fill="#ef4444" fontSize="9" fontWeight="600">100</text>
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-4xl font-black leading-none" style={{ color: c.text }}>
            {score}
          </span>
        </div>
      </div>

      {/* Label */}
      <div
        className="mt-1 px-4 py-1.5 rounded-full text-sm font-semibold"
        style={{ color: c.text, backgroundColor: c.bg }}
      >
        {label}
      </div>

      {/* Breakdown bars */}
      <div className="w-full mt-5 space-y-0.5">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10 mb-2">
          <span className="text-xs font-semibold text-slate-300 w-36">Factor</span>
          <span className="flex-1 text-xs text-slate-400">Score</span>
          <span className="w-10 text-right text-xs text-slate-400">Raw</span>
          <span className="w-8 text-right text-xs text-slate-400">Wt</span>
        </div>
        <ScoreRow label="$/sqft vs Comps" score={breakdown.psqft_score} weight="40%" tooltip="How the subject property's price-per-square-foot compares to the median of comparable sold homes. Higher = more overpriced." />
        <ScoreRow label="Days on Market" score={breakdown.dom_score} weight="20%" tooltip="How long this home has been listed vs. the zip code average. High DOM relative to average often signals overpricing." />
        <ScoreRow label="Price-to-Rent Ratio" score={breakdown.ptr_score} weight="20%" tooltip="Asking price divided by annual rent. <15 favors buying; >20 suggests renting is cheaper." />
        <ScoreRow label="Price Reductions" score={breakdown.price_reduction_score} weight="10%" tooltip="Any price reductions since original listing. Multiple reductions signal the seller priced too high initially." />
        <ScoreRow label="Tax Assessed Gap" score={breakdown.tax_gap_score} weight="10%" tooltip="How much the asking price exceeds the county tax-assessed value. A large gap can indicate overvaluation." />
      </div>
    </div>
  );
}
