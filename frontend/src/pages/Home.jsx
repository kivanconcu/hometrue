import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import OvervaluationGauge from "../components/OvervaluationGauge";
import CompsTable from "../components/CompsTable";
import PriceChart from "../components/PriceChart";
import ProjectionChart from "../components/ProjectionChart";
import RedFlagPanel from "../components/RedFlagPanel";
import NeighborhoodStats from "../components/NeighborhoodStats";
import ReportButton from "../components/ReportButton";
import ARVCalculator from "../components/ARVCalculator";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Collapsible Card (dark, for results) ──────────────────────────
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
        <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

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

function PTRIndicator({ ptr, benchmark, monthly_rent }) {
  const color = benchmark === "buy" ? "text-green-400" : benchmark === "rent" ? "text-red-400" : "text-yellow-400";
  const bg    = benchmark === "buy" ? "bg-green-500/10 border-green-500/20" : benchmark === "rent" ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20";
  const label = benchmark === "buy" ? "Buy Signal" : benchmark === "rent" ? "Rent Signal" : "Neutral";
  return (
    <div className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border ${bg}`}>
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Price-to-Rent Ratio</p>
        <p className={`text-3xl font-black ${color}`}>{ptr?.toFixed(1) || "—"}</p>
      </div>
      <div>
        <span className={`font-bold text-lg ${color}`}>{label}</span>
        <p className="text-xs text-slate-400 mt-0.5">Est. monthly rent: <strong className="text-white">${monthly_rent?.toLocaleString()}</strong></p>
      </div>
      <div className="text-xs text-slate-400 flex flex-col gap-0.5 ml-auto">
        <span className="text-green-400">{"< 15"} — Buy</span>
        <span className="text-yellow-400">15–20 — Neutral</span>
        <span className="text-red-400">{"> 20"} — Rent</span>
      </div>
    </div>
  );
}

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
      {dom != null && zip_avg > 0 && ratio > 2 && <div className="badge-red">DOM {ratio.toFixed(1)}× avg — potential overpricing</div>}
      {dom != null && zip_avg > 0 && ratio <= 1 && <div className="badge-green">Selling quickly — strong demand</div>}
    </div>
  );
}

function PropertySummary({ property, estimated_annual_tax, tax_source, zestimate, zillow_url }) {
  const { address, city, state, zip_code, bedrooms, bathrooms, sqft, year_built,
    asking_price, days_on_market, price_reductions, total_price_reduction, tax_assessed_value, is_mock } = property;
  const zestDiff    = zestimate && asking_price ? asking_price - zestimate : null;
  const zestDiffPct = zestDiff != null && zestimate ? ((zestDiff / zestimate) * 100).toFixed(1) : null;

  const items = [
    { label: "Asking Price", value: asking_price ? `$${asking_price.toLocaleString()}` : "N/A",
      sub: zestimate ? (zestDiff > 0 ? `$${Math.abs(zestDiff).toLocaleString()} above assessed` : zestDiff < 0 ? `$${Math.abs(zestDiff).toLocaleString()} below assessed` : "At assessed value") : null,
      subColor: zestDiff != null ? (zestDiff > 0 ? "text-red-400" : "text-green-400") : null },
    { label: "Assessed Value", value: zestimate ? `$${zestimate.toLocaleString()}` : "N/A",
      sub: zestDiffPct != null ? (zestDiff > 0 ? `+${zestDiffPct}% over` : `${zestDiffPct}% under`) : null,
      subColor: zestDiff != null ? (zestDiff > 0 ? "text-red-400" : "text-green-400") : null },
    { label: "Beds",     value: bedrooms  ?? "—" },
    { label: "Baths",    value: bathrooms ?? "—" },
    { label: "Sqft",     value: sqft ? sqft.toLocaleString() : "—" },
    { label: "Year",     value: year_built ?? "—" },
    { label: "DOM",      value: days_on_market ?? "—" },
    { label: "Tax Assessed", value: tax_assessed_value ? `$${tax_assessed_value.toLocaleString()}` : "—", sub: tax_source || null },
    { label: "Est. Annual Tax", value: estimated_annual_tax ? `$${estimated_annual_tax.toLocaleString()}` : "—", sub: "Census ACS" },
    { label: "Price Cuts", value: price_reductions > 0 ? `${price_reductions} (-$${total_price_reduction?.toLocaleString()})` : "None" },
  ];

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5 mb-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">{address}</h2>
          <p className="text-slate-400 text-sm">{city}, {state} {zip_code}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {is_mock && <span className="badge-yellow text-xs">Mock Data</span>}
          {zillow_url && <a href={zillow_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline transition">View on Zillow ↗</a>}
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

// ── Video Modal ────────────────────────────────────────────────────
function VideoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          Close
        </button>
        <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-white/10">
          {/* Replace VIDEO_ID below with your actual YouTube video ID */}
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            title="HomeTrue Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

// ── Landing Sections ───────────────────────────────────────────────
function LandingPage({ onSearch, loading }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showVideo, setShowVideo]   = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const steps = [
    { n: "1", title: "Find any property", desc: "Type in the address of any property in a disclosure state. Property details are fetched automatically." },
    { n: "2", title: "AI selects the best comps", desc: "HomeTrue analyzes hundreds of properties in seconds, surfacing the top matches based on size, age, and proximity." },
    { n: "3", title: "Generate a full comp report", desc: "Get a full comp report you can share with partners and potential buyers. Export to PDF with one click." },
    { n: "4", title: "ARV Calculation", desc: "Adjust repair costs, assignment fees, and MAO percentages to calculate your offer to the seller and sale price to the buyer." },
  ];

  const features = [
    { title: "Comparable Sales (CMA)", desc: "AI-matched sold comps with $/sqft comparison and deviation analysis.", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { title: "Overvaluation Score", desc: "A 0–100 composite score built from comps, DOM, price-to-rent, price cuts, and tax gap.", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
    { title: "Rent & Price-to-Rent", desc: "RentCast AVM + Census rent data with buy vs. rent signal analysis.", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { title: "ARV Deal Calculator", desc: "Wholesale deal analysis with MAO, repair costs, assignment fees, and end-buyer equity.", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}

      {/* Announcement banner */}
      {showBanner && (
        <div className="bg-orange-500 px-4 py-2.5 text-center text-sm text-white flex items-center justify-center gap-3 relative">
          <span className="font-medium">HomeTrue v2 just launched — RentCast AVM + ARV Calculator now live!</span>
          <button onClick={() => setShowBanner(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-gray-900">HomeTrue</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900 transition">How It Works</a>
            <a href="#features"     className="hover:text-gray-900 transition">Features</a>
            <a href="#pricing"      className="hover:text-gray-900 transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
                <button onClick={logout} className="btn-outline text-sm px-4 py-2">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="btn-outline text-sm px-4 py-2">Sign In</Link>
                <Link to="/signup" className="btn-orange text-sm px-4 py-2">Try Free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 text-orange-600 text-xs font-semibold mb-6">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
          AI-Powered Property Intelligence
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 mb-5 leading-tight">
          Property Comps & Analysis<br />
          <span className="text-orange-500">10x Faster With AI</span>
        </h1>
        <p className="text-gray-500 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          The data-driven way to calculate, compare, and make smarter real estate decisions.
        </p>
        <div className="flex justify-center gap-4 mb-14">
          <Link to="/signup" className="btn-orange px-7 py-3.5 text-base">Try it Free</Link>
          <button onClick={() => setShowVideo(true)} className="flex items-center gap-2 border border-gray-300 hover:border-orange-400 text-gray-700 hover:text-orange-600 font-medium px-6 py-3.5 rounded-xl transition text-base">
            <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-orange-500 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            </div>
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-12 sm:gap-20 mb-0">
          {[["10+", "Data sources"], ["60s", "Full analysis"], ["100%", "Automated"]].map(([v, l]) => (
            <div key={l} className="text-center">
              <p className="text-3xl font-black text-orange-500">{v}</p>
              <p className="text-gray-500 text-sm mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo video / screenshot banner ────────────────── */}
      <section className="bg-gray-50 border-y border-gray-200 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div
            className="relative rounded-2xl overflow-hidden border-2 border-gray-200 shadow-xl cursor-pointer group"
            onClick={() => setShowVideo(true)}
          >
            {/* Mock app screenshot */}
            <div className="bg-gray-900 p-6 min-h-[320px] flex flex-col gap-4">
              {/* Fake header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500 rounded-md" />
                  <span className="text-white font-black text-sm">HomeTrue</span>
                </div>
                <div className="h-3 w-32 bg-white/10 rounded" />
              </div>
              {/* Fake search bar */}
              <div className="bg-white/10 rounded-xl h-12 flex items-center px-4 gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500/50" />
                <div className="h-3 w-64 bg-white/20 rounded" />
              </div>
              {/* Fake result cards */}
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="h-2.5 w-20 bg-white/20 rounded mb-3" />
                    <div className="h-6 w-16 bg-orange-500/30 rounded mb-2" />
                    <div className="h-2 w-full bg-white/10 rounded" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-24">
                  <div className="h-2.5 w-24 bg-white/20 rounded mb-3" />
                  <div className="h-3 w-full bg-white/10 rounded mb-1.5" />
                  <div className="h-3 w-3/4 bg-white/10 rounded" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-24">
                  <div className="h-2.5 w-24 bg-white/20 rounded mb-3" />
                  <div className="h-8 w-16 bg-green-500/30 rounded" />
                </div>
              </div>
            </div>
            {/* Play button overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition">
                <svg className="w-6 h-6 text-orange-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-4">Click to watch a 2-minute demo</p>
        </div>
      </section>

      {/* ── Search section ────────────────────────────────── */}
      <section id="search-section" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Try it now — no account needed</h2>
          <p className="text-gray-500">Enter any U.S. property address to get a full analysis instantly</p>
        </div>
        <SearchBar onSearch={onSearch} loading={loading} />
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Get accurate comps in just 60 seconds</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Fast, effortless, and precise results at your fingertips.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center mb-4">
                  <span className="text-orange-600 font-black text-sm">{n}</span>
                </div>
                <h4 className="text-gray-900 font-bold text-base mb-2">{title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/signup" className="btn-orange px-7 py-3.5 text-base inline-block">Get Started</Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Everything you need to evaluate a deal</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Institutional-grade data, made accessible to every investor.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ title, desc, icon }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition">
              <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
              <h4 className="text-gray-900 font-bold text-base mb-2">{title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <section id="pricing" className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg">Cancel anytime. No hidden fees.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Starter", price: "$9", period: "/mo", searches: "20 analyses/mo", features: ["20 property analyses", "PDF comp reports", "ARV calculator", "Email support"] },
              { name: "Pro",     price: "$29", period: "/mo", searches: "200 analyses/mo", features: ["200 property analyses", "PDF comp reports", "ARV calculator", "Priority support", "API access"], popular: true },
              { name: "Unlimited", price: "$79", period: "/mo", searches: "Unlimited", features: ["Unlimited analyses", "PDF comp reports", "ARV calculator", "Dedicated support", "API access", "White-label reports"] },
            ].map(p => (
              <div key={p.name} className={`relative bg-white rounded-2xl border-2 p-6 shadow-sm ${p.popular ? "border-orange-500 shadow-orange-100 shadow-lg" : "border-gray-200"}`}>
                {p.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-bold text-gray-900 text-lg mb-1">{p.name}</h3>
                <p className="text-orange-600 text-sm font-medium mb-3">{p.searches}</p>
                <p className="text-4xl font-black text-gray-900 mb-6">{p.price}<span className="text-lg font-normal text-gray-400">{p.period}</span></p>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`block text-center py-3 rounded-xl font-bold text-sm transition ${p.popular ? "btn-orange" : "border-2 border-gray-200 hover:border-orange-400 text-gray-700 hover:text-orange-600"}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Ready to close more deals?</h2>
          <p className="text-gray-500 text-lg mb-8">Use HomeTrue to analyze and close deals 10x faster.</p>
          <Link to="/signup" className="btn-orange px-8 py-4 text-lg inline-flex items-center gap-2">
            Try Free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <span className="text-white font-black">HomeTrue</span>
            </div>
            <p className="text-gray-500 text-xs text-center">© 2026 HomeTrue. For informational purposes only. Not financial or legal advice.</p>
            <div className="flex gap-5 text-xs text-gray-400">
              <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
              <a href="#features"     className="hover:text-white transition">Features</a>
              <a href="#pricing"      className="hover:text-white transition">Pricing</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-gray-600">
            Data: ATTOM · RentCast · U.S. Census Bureau ACS · HUD Fair Market Rents · FHFA HPI · OpenStreetMap
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const { user } = useAuth();

  const handleSearch = useCallback(async (searchData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const { data } = await axios.post(`${API}/api/analyze`, searchData);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to analyze property. Please check the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Show landing page when idle
  if (!result && !loading && !error) {
    return <LandingPage onSearch={handleSearch} loading={loading} />;
  }

  function scoreBadge(score, color) {
    const cls = color === "green" ? "badge-green" : color === "red" ? "badge-red" : "badge-yellow";
    return <span className={cls}>{score}/100</span>;
  }

  // ── Results view ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sticky header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => { setResult(null); setError(null); }} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-white">HomeTrue</span>
          </button>
          <p className="text-xs text-slate-400 hidden sm:block">← Back to home</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-300 text-sm mb-6">{error}</div>
        )}

        {loading && <Skeleton />}

        {result && (
          <div>
            {result.disclaimer && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-3 text-yellow-200 text-sm mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {result.disclaimer}
              </div>
            )}

            <PropertySummary property={result.property} estimated_annual_tax={result.estimated_annual_tax} tax_source={result.tax_source} zestimate={result.zestimate} zillow_url={result.zillow_url} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-0">
                <Card title="Red & Green Flags" badge={<span className="text-xs text-slate-400">{result.flags.filter(f => f.type === "red").length} red · {result.flags.filter(f => f.type === "green").length} green</span>}>
                  <RedFlagPanel flags={result.flags} />
                </Card>
                <Card title="Comparable Sales (CMA)" badge={<span className="badge-green">{result.comps.length} comps</span>} sourceTag="Source: ATTOM Data">
                  <CompsTable comps={result.comps} subject_price_per_sqft={result.subject_price_per_sqft} median_comp_price_per_sqft={result.median_comp_price_per_sqft} />
                </Card>
                <Card title="Price Per Square Foot Analysis" sourceTag="Source: ATTOM Data">
                  <PriceChart subject_price_per_sqft={result.subject_price_per_sqft} avg_comp_price_per_sqft={result.avg_comp_price_per_sqft} median_comp_price_per_sqft={result.median_comp_price_per_sqft} comps={result.comps} />
                </Card>
                <Card title="Price-to-Rent Ratio" sourceTag={`Source: ${result.rent_source || "HUD FMR / Census ACS"}`}>
                  <PTRIndicator ptr={result.price_to_rent_ratio} benchmark={result.ptr_benchmark} monthly_rent={result.monthly_rent_estimate} />
                </Card>
                <Card title="Days on Market Analysis" sourceTag="Source: ATTOM Data / MLS">
                  <DOMIndicator dom={result.property.days_on_market} zip_avg={result.dom_zip_average} />
                </Card>
                <Card title="Historical Price Trends & Projections" sourceTag="Source: FHFA HPI">
                  <ProjectionChart trends={result.trends} asking_price={result.property.asking_price} />
                </Card>
                <Card title="Neighborhood Signals" sourceTag="Source: U.S. Census Bureau">
                  <NeighborhoodStats neighborhood={result.neighborhood} />
                </Card>
                <Card title="ARV & Deal Calculator" badge={<span className="badge-orange">Wholesaler Tool</span>}>
                  <ARVCalculator
                    medianCompPrice={result.median_comp_price_per_sqft && result.property.sqft ? result.median_comp_price_per_sqft * result.property.sqft : null}
                    askingPrice={result.property.asking_price}
                  />
                </Card>
              </div>

              <div className="space-y-4">
                <div className="card p-5 lg:sticky lg:top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Overvaluation Score</h3>
                    {scoreBadge(result.valuation_score.score, result.valuation_score.color)}
                  </div>
                  <OvervaluationGauge valuation_score={result.valuation_score} />
                </div>
                <div className="card p-5">
                  <h3 className="font-semibold text-white mb-3">Full Report</h3>
                  <ReportButton analysisData={result} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
