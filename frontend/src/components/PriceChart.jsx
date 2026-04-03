import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

export default function PriceChart({
  subject_price_per_sqft,
  avg_comp_price_per_sqft,
  median_comp_price_per_sqft,
  comps,
}) {
  if (!median_comp_price_per_sqft) return null;

  // Color based on subject vs median
  function subjectColor() {
    if (!subject_price_per_sqft) return "#94a3b8";
    const diff = (subject_price_per_sqft - median_comp_price_per_sqft) / median_comp_price_per_sqft * 100;
    if (diff <= 5) return "#22c55e";
    if (diff <= 15) return "#eab308";
    return "#ef4444";
  }

  const barData = [
    { name: "Subject", value: subject_price_per_sqft || 0, label: "This Home" },
    { name: "Median Comp", value: median_comp_price_per_sqft, label: "Median Comp" },
    { name: "Avg Comp", value: avg_comp_price_per_sqft, label: "Avg Comp" },
  ];

  // Scatter of individual comps
  const scatterData = comps
    .filter(c => c.price_per_sqft > 0)
    .map((c, i) => ({ name: `Comp ${i + 1}`, value: c.price_per_sqft }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-navy-900 border border-white/20 rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-white font-semibold">{payload[0].name}</p>
        <p className="text-green-400">${payload[0].value?.toFixed(0)}/sqft</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main bar chart */}
      <div>
        <p className="text-xs text-slate-400 mb-3">Price Per Square Foot Comparison</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, "auto"]}
              tickFormatter={v => `$${v}`}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
              {barData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={i === 0 ? subjectColor() : i === 1 ? "#3b82f6" : "#6366f1"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
            <ReferenceLine
              x={median_comp_price_per_sqft}
              stroke="#ffffff30"
              strokeDasharray="4 4"
              label={{ value: "Median", fill: "#94a3b8", fontSize: 10 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: "#22c55e", label: "At or below median (good deal)" },
          { color: "#eab308", label: "5–15% above median (watch)" },
          { color: "#ef4444", label: "15%+ above median (overpriced)" },
          { color: "#3b82f6", label: "Median comp $/sqft" },
          { color: "#6366f1", label: "Average comp $/sqft" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Individual comp dots */}
      {scatterData.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Individual Comp $/sqft Spread</p>
          <div className="flex flex-wrap gap-2">
            {scatterData.map((d, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
                title={d.name}
              >
                <span className="text-slate-400">C{i + 1}  </span>
                <span className="text-white font-mono">${d.value?.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
