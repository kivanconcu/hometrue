import React, { useState, useCallback } from "react";
import axios from "axios";
import SearchBar from "../components/SearchBar";
import OvervaluationGauge from "../components/OvervaluationGauge";
import CompsTable from "../components/CompsTable";
import PriceChart from "../components/PriceChart";
import ProjectionChart from "../components/ProjectionChart";
import RedFlagPanel from "../components/RedFlagPanel";
import NeighborhoodStats from "../components/NeighborhoodStats";
import ReportButton from "../components/ReportButton";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Collapsible Card ───────────────────────────────────────────────
function Card({ title, badge, sourceTag, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-4">
      <div className="card-header" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white text-base">{title}</h3>
          {badge}
          {sourceTag && <span className="source-tag hidden sm:inline">{sourceTag}</span>}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      {[300, 200, 250, 180].map((h, i) => (
        <div key={i} className="card">
          <div className="p-5">
            <div className="skeleton h-5 w-40 mb-4 rounded" />
            <div className="skeleton rounded" style={{ height: h }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PTR Indicator ──────────────────────────────────────────────────
function PTRIndicator({ ptr, benchmark, monthly_rent }) {
  const color = benchmark === "buy" ? "text-green-400" : benchmark === "rent" ? "text-red-400" : "text-yellow-400";
  const bg = benchmark === "buy" ? "bg-green-500/10 border-green-500/20" : benchmark === "rent" ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20";
  const label = benchmark === "buy" ? "Buy Signal" : benchmark === "rent" ? "Rent Signal" : "Neutral";
  return (
    <div className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border ${bg}`}>
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Price-to-Rent Ratio</p>
        <p className={`text-3xl font-black ${color}`}>{ptr?.toFixed(1) || "—"}</p>
      </div>
      <div>
        <span className={`font-bold text-lg ${color}`}>{label}</span>
        <p className="text-xs text-slate-400 mt-0.5">
          Est. monthly rent: <strong className="text-white">${monthly_rent?.toLocaleString()}</strong>
        </p>
      </div>
      <div className="text-xs text-slate-400 flex flex-col gap-0.5 ml-auto">
        <span className="text-green-400">{"< 15"}  — Buy</span>
        <span className="text-yellow-400">15–20 — Neutral</span>
        <span className="text-red-400">{"> 20"}  — Rent</span>
      </div>
    </div>
  );
}

// ── DOM Indicator ──────────────────────────────────────────────────
function DOMIndicator({ dom, zip_avg }) {
  const ratio = zip_avg > 0 ? dom / zip_avg : 1;
  const color = ratio > 2 ? "text-red-400" : ratio > 1.3 ? "text-yellow-400" : "text-green-400";
  return (
    <div className="flex flex-wrap gap-6 items-center">
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Days on Market</p>
        <p className={`text-3xl font-black ${color}`}>{dom ?? "—"}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-0.5">ZIP Average</p>
        <p className="text-3xl font-black text-white">{zip_avg?.toFixed(0) ?? "—"}</p>
      </div>
      {dom != null && zip_avg > 0 && ratio > 2 && (
        <div className="badge-red">DOM {(ratio).toFixed(1)}× avg — potential overpricing signal</div>
      )}
      {dom != null && zip_avg > 0 && ratio <= 1 && (
        <div className="badge-green">Selling quickly — strong demand signal</div>
      )}
    </div>
  );
}

// ── Property Summary Bar ───────────────────────────────────────────
function PropertySummary({ property, estimated_annual_tax, tax_source, zestimate, zillow_url }) {
  const { address, city, state, zip_code, bedrooms, bathrooms, sqft, year_built,
    asking_price, days_on_market, price_reductions, total_price_reduction, tax_assessed_value, is_mock } = property;

  const zestDiff = zestimate && asking_price
    ? asking_price - zestimate
    : null;
  const zestDiffPct = zestDiff != null && zestimate
    ? ((zestDiff / zestimate) * 100).toFixed(1)
    : null;

  const items = [
    {
      label: "Asking Price",
      value: asking_price ? `$${asking_price.toLocaleString()}` : "N/A",
      sub: zestimate
        ? (zestDiff > 0
            ? `$${Math.abs(zestDiff).toLocaleString()} above Zestimate`
            : zestDiff < 0
              ? `$${Math.abs(zestDiff).toLocaleString()} below Zestimate`
              : "At Zestimate")
        : null,
      subColor: zestDiff != null
        ? (zestDiff > 0 ? "text-red-400" : "text-green-400")
        : null,
    },
    {
      label: "Zillow Zestimate",
      value: zestimate ? `$${zestimate.toLocaleString()}` : "N/A",
      sub: zestDiffPct != null
        ? (zestDiff > 0 ? `+${zestDiffPct}% over` : `${zestDiffPct}% under`)
        : null,
      subColor: zestDiff != null
        ? (zestDiff > 0 ? "text-red-400" : "text-green-400")
        : null,
    },
    { label: "Beds", value: bedrooms ?? "—" },
    { label: "Baths", value: bathrooms ?? "—" },
    { label: "Sqft", value: sqft ? sqft.toLocaleString() : "—" },
    { label: "Year", value: year_built ?? "—" },
    { label: "DOM", value: days_on_market ?? "—" },
    {
      label: "Tax Assessed",
      value: tax_assessed_value ? `$${tax_assessed_value.toLocaleString()}` : "—",
      sub: tax_source || null,
    },
    {
      label: "Est. Annual Tax",
      value: estimated_annual_tax ? `$${estimated_annual_tax.toLocaleString()}` : "—",
      sub: "Census ACS local rate",
    },
    { label: "Price Cuts", value: price_reductions > 0 ? `${price_reductions} (-$${total_price_reduction?.toLocaleString()})` : "None" },
  ];
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 mb-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">{address}</h2>
          <p className="text-slate-400 text-sm">{city}, {state} {zip_code}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {is_mock && <span className="badge-yellow text-xs">Mock Data</span>}
          {zillow_url && (
            <a href={zillow_url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-blue-400 hover:text-blue-300 underline transition">
              View on Zillow ↗
            </a>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {items.map(({ label, value, sub, subColor }) => (
          <div key={label} className="bg-white/5 rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
            {sub && <p className={`text-[10px] mt-0.5 leading-tight ${subColor || "text-slate-500"}`}>{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async (searchData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.post(`${API}/api/analyze`, searchData);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to analyze property. Please check the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Score badge helper
  function scoreBadge(score, color) {
    const cls = color === "green" ? "badge-green" : color === "red" ? "badge-red" : "badge-yellow";
    return <span className={cls}>{score}/100</span>;
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-navy-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-navy-900" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-white">HomeTrue</span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">AI-powered home valuation analysis</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero search */}
        {!result && !loading && (
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
              Is This Home <span className="text-green-400">Worth It?</span>
            </h1>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
              Enter any U.S. home address to get a comprehensive valuation report — comps, overvaluation score, price projections, and red flags.
            </p>
          </div>
        )}

        <div className={result || loading ? "mb-6" : "mb-0"}>
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {loading && <Skeleton />}

        {result && (
          <div>
            {/* Mock disclaimer */}
            {result.disclaimer && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-3 text-yellow-200 text-sm mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {result.disclaimer}
              </div>
            )}

            <PropertySummary
              property={result.property}
              estimated_annual_tax={result.estimated_annual_tax}
              tax_source={result.tax_source}
              zestimate={result.zestimate}
              zillow_url={result.zillow_url}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-0">

                {/* Red & Green Flags */}
                <Card title="Red & Green Flags" badge={
                  <span className="text-xs text-slate-400">
                    {result.flags.filter(f => f.type === "red").length} red ·{" "}
                    {result.flags.filter(f => f.type === "green").length} green
                  </span>
                }>
                  <RedFlagPanel flags={result.flags} />
                </Card>

                {/* CMA */}
                <Card
                  title="Comparable Sales (CMA)"
                  badge={<span className="badge-green">{result.comps.length} comps</span>}
                  sourceTag="Source: ATTOM Data"
                >
                  <CompsTable
                    comps={result.comps}
                    subject_price_per_sqft={result.subject_price_per_sqft}
                    median_comp_price_per_sqft={result.median_comp_price_per_sqft}
                  />
                </Card>

                {/* $/sqft chart */}
                <Card title="Price Per Square Foot Analysis" sourceTag="Source: ATTOM Data">
                  <PriceChart
                    subject_price_per_sqft={result.subject_price_per_sqft}
                    avg_comp_price_per_sqft={result.avg_comp_price_per_sqft}
                    median_comp_price_per_sqft={result.median_comp_price_per_sqft}
                    comps={result.comps}
                  />
                </Card>

                {/* Price-to-Rent */}
                <Card title="Price-to-Rent Ratio" sourceTag={`Source: ${result.rent_source || "HUD FMR / Census ACS"}`}>
                  <PTRIndicator
                    ptr={result.price_to_rent_ratio}
                    benchmark={result.ptr_benchmark}
                    monthly_rent={result.monthly_rent_estimate}
                  />
                </Card>

                {/* DOM */}
                <Card title="Days on Market Analysis" sourceTag="Source: ATTOM Data / MLS">
                  <DOMIndicator dom={result.property.days_on_market} zip_avg={result.dom_zip_average} />
                </Card>

                {/* Historical trends */}
                <Card title="Historical Price Trends & Projections" sourceTag="Source: FHFA HPI">
                  <ProjectionChart trends={result.trends} asking_price={result.property.asking_price} />
                </Card>

                {/* Neighborhood */}
                <Card title="Neighborhood Signals" sourceTag="Source: U.S. Census Bureau">
                  <NeighborhoodStats neighborhood={result.neighborhood} />
                </Card>
              </div>

              {/* Right column — sticky gauge */}
              <div className="space-y-4">
                <div className="card p-5 lg:sticky lg:top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Overvaluation Score</h3>
                    {scoreBadge(result.valuation_score.score, result.valuation_score.color)}
                  </div>
                  <OvervaluationGauge valuation_score={result.valuation_score} />
                </div>

                {/* PDF report */}
                <div className="card p-5">
                  <h3 className="font-semibold text-white mb-3">Full Report</h3>
                  <ReportButton analysisData={result} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <footer className="mt-16 pb-8 text-center text-xs text-slate-600">
            HomeTrue — For informational purposes only. Not financial or legal advice.<br />
            Data: ATTOM · Zillow · U.S. Census Bureau ACS · HUD Fair Market Rents · FHFA HPI · OpenStreetMap
          </footer>
        )}
      </main>
    </div>
  );
}
