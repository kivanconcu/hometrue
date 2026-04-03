import React from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

function fmt(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
}

export default function ProjectionChart({ trends, asking_price }) {
  if (!trends?.points?.length) return null;

  // Build chart data: merge historical + projected into one series
  const chartData = trends.points.map(pt => {
    const obj = {
      date: pt.date,
      index: pt.is_projected ? null : pt.index,
      moving_avg: pt.moving_avg || null,
      projected: pt.is_projected ? pt.index : null,
      lower: pt.is_projected ? pt.lower_bound : null,
      upper: pt.is_projected ? pt.upper_bound : null,
      // Bridge: last historical point also appears as projected start
    };
    return obj;
  });

  // Bridge the gap: the last historical point should also appear as projected start
  const lastHistIdx = chartData.reduce((acc, d, i) => d.index !== null ? i : acc, -1);
  if (lastHistIdx >= 0 && lastHistIdx + 1 < chartData.length) {
    const bridge = chartData[lastHistIdx];
    chartData[lastHistIdx] = { ...bridge, projected: bridge.index };
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-navy-900 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl space-y-1">
        <p className="text-white font-semibold mb-1">{label}</p>
        {payload.map((p) => (
          p.value != null && (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {p.value?.toFixed(1)}
            </p>
          )
        ))}
      </div>
    );
  };

  // Projected values table
  const projVals = trends.projected_values || [];

  const tickFormatter = (v) => {
    const idx = chartData.findIndex(d => d.date === v);
    if (chartData.length <= 16) return v;
    return idx % 4 === 0 ? v : "";
  };

  return (
    <div className="space-y-5">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }}
            formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
          />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#confBand)"
            name="Upper bound"
            legendType="none"
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#0f172a"
            name="Lower bound"
            legendType="none"
            connectNulls={false}
          />

          {/* Historical HPI */}
          <Line
            type="monotone"
            dataKey="index"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={false}
            name="HPI (historical)"
            connectNulls={false}
          />
          {/* Moving average */}
          <Line
            type="monotone"
            dataKey="moving_avg"
            stroke="#86efac"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name="12-mo avg"
            connectNulls={false}
          />
          {/* Projected */}
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Projected"
            connectNulls={false}
          />

          {/* Divider between history/projection */}
          {lastHistIdx >= 0 && (
            <ReferenceLine
              x={chartData[lastHistIdx]?.date}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
              label={{ value: "Today", fill: "#64748b", fontSize: 9, position: "insideTopRight" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* YoY change */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Year-over-year change:</span>
        <span className={`font-bold ${trends.yoy_change >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trends.yoy_change >= 0 ? "+" : ""}{trends.yoy_change?.toFixed(1)}%
        </span>
        <span className="text-slate-500 text-xs">({trends.metro})</span>
      </div>

      {/* Projected value table */}
      {projVals.length > 0 && asking_price && (
        <div>
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Projected Home Value</p>
          <div className="grid grid-cols-3 gap-3">
            {projVals.map(pv => (
              <div key={pv.years_out} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">{pv.years_out} Year{pv.years_out > 1 ? "s" : ""}</p>
                <p className="text-xl font-bold text-white">${pv.estimated_value?.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ${pv.lower_value?.toLocaleString()} – ${pv.upper_value?.toLocaleString()}
                </p>
                <p className={`text-xs font-semibold mt-1 ${pv.estimated_value >= asking_price ? "text-green-400" : "text-red-400"}`}>
                  {pv.estimated_value >= asking_price
                    ? `+${((pv.estimated_value - asking_price) / asking_price * 100).toFixed(1)}% gain`
                    : `${((pv.estimated_value - asking_price) / asking_price * 100).toFixed(1)}% loss`}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            ⚠ Projections are estimates based on FHFA HPI linear regression. Not guarantees of future value.
          </p>
        </div>
      )}
    </div>
  );
}
