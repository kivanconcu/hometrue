import React from "react";

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent || "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function DonutSegment({ pct, color, r = 28, cx = 32, cy = 32 }) {
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <circle
      cx={cx} cy={cy} r={r}
      fill="none"
      stroke={color}
      strokeWidth="10"
      strokeDasharray={`${dash} ${circ}`}
      strokeLinecap="butt"
      transform={`rotate(-90 ${cx} ${cy})`}
      opacity="0.85"
    />
  );
}

export default function NeighborhoodStats({ neighborhood }) {
  const {
    median_income, population,
    owner_occupied_pct, renter_occupied_pct,
    median_annual_tax, median_home_value, effective_tax_rate,
    income_affordability_stress, data_source, is_mock,
  } = neighborhood;

  const ownerPct = owner_occupied_pct || 0;
  const renterPct = renter_occupied_pct || 0;

  return (
    <div className="space-y-5">
      {is_mock && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 text-xs text-yellow-300">
          Using estimated demographic data (Census API unavailable for this ZIP).
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Median Household Income"
          value={median_income ? `$${median_income.toLocaleString()}` : "N/A"}
          sub="ACS 5-Year Estimate"
          accent={income_affordability_stress ? "text-yellow-400" : "text-white"}
        />
        <StatCard
          label="Population"
          value={population ? population.toLocaleString() : "N/A"}
          sub="ZIP code tabulation area"
        />
        <StatCard
          label="Median Home Value"
          value={median_home_value ? `$${median_home_value.toLocaleString()}` : "N/A"}
          sub="Owner-occupied units"
        />
        <StatCard
          label="Median Annual Tax"
          value={median_annual_tax ? `$${median_annual_tax.toLocaleString()}` : "N/A"}
          sub="Owner-occ. w/ mortgage"
          accent="text-blue-300"
        />
        <StatCard
          label="Effective Tax Rate"
          value={effective_tax_rate ? `${effective_tax_rate.toFixed(2)}%` : "N/A"}
          sub="Median tax / median value"
          accent="text-blue-300"
        />
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">Owner vs. Renter</p>
          <div className="flex items-center gap-4">
            {/* Mini donut */}
            <svg viewBox="0 0 64 64" className="w-14 h-14 flex-shrink-0">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <DonutSegment pct={ownerPct} color="#22c55e" />
            </svg>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-shrink-0" />
                <span className="text-white font-semibold">{ownerPct.toFixed(0)}%</span>
                <span className="text-slate-400">own</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-white/20 flex-shrink-0" />
                <span className="text-white font-semibold">{renterPct.toFixed(0)}%</span>
                <span className="text-slate-400">rent</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {income_affordability_stress && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-yellow-200">
            <strong>Affordability Stress:</strong> The asking price is more than 6× the area's median household income, which may indicate this market is stretched beyond local buying power.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500">Source: {data_source}</p>
    </div>
  );
}
