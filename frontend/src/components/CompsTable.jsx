import React, { useState } from "react";

function fmt(n) { return n ? `$${Number(n).toLocaleString()}` : "—"; }
function fmtDate(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return s; }
}

export default function CompsTable({ comps, subject_price_per_sqft, median_comp_price_per_sqft }) {
  const [sortKey, setSortKey] = useState("sold_date");
  const [sortDir, setSortDir] = useState("desc");

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...comps].sort((a, b) => {
    let av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
    if (typeof av === "string") av = av.toLowerCase(), bv = (bv || "").toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function psqftColor(psqft) {
    if (!subject_price_per_sqft || !psqft) return "";
    const diff = (psqft - subject_price_per_sqft) / subject_price_per_sqft * 100;
    if (diff < -5) return "text-green-400";
    if (diff > 15) return "text-red-400";
    return "text-yellow-400";
  }

  const cols = [
    { key: "address", label: "Address" },
    { key: "sold_price", label: "Sold Price" },
    { key: "sqft", label: "Sq Ft" },
    { key: "price_per_sqft", label: "$/sqft" },
    { key: "sold_date", label: "Sold Date" },
    { key: "bedrooms", label: "Bed/Bath" },
    { key: "distance_miles", label: "Distance" },
  ];

  function SortIcon({ col }) {
    if (sortKey !== col) return <span className="text-white/20 ml-1">↕</span>;
    return <span className="text-green-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {cols.map(c => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition select-none whitespace-nowrap"
              >
                {c.label}<SortIcon col={c.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((comp, i) => {
            const isSubject = comp.is_subject;
            return (
              <tr
                key={i}
                className={`border-b border-white/5 transition hover:bg-white/5 ${isSubject ? "bg-green-500/10 border-l-2 border-l-green-500" : ""}`}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {isSubject && (
                      <span className="badge-green text-xs">Subject</span>
                    )}
                    <span className={`${isSubject ? "font-semibold text-white" : "text-slate-200"} truncate max-w-[180px]`}>
                      {comp.address}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 font-semibold text-white">{fmt(comp.sold_price)}</td>
                <td className="px-3 py-3 text-slate-300">{comp.sqft ? comp.sqft.toLocaleString() : "—"}</td>
                <td className={`px-3 py-3 font-mono font-semibold ${psqftColor(comp.price_per_sqft)}`}>
                  {comp.price_per_sqft ? `$${comp.price_per_sqft.toFixed(0)}` : "—"}
                </td>
                <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{fmtDate(comp.sold_date)}</td>
                <td className="px-3 py-3 text-slate-300">{comp.bedrooms}bd / {comp.bathrooms}ba</td>
                <td className="px-3 py-3 text-slate-400">
                  {comp.distance_miles != null ? `${comp.distance_miles} mi` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary row */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-white/5 rounded-lg px-4 py-2">
          <span className="text-slate-400 text-xs">Median $/sqft</span>
          <p className="font-bold text-white">${median_comp_price_per_sqft?.toFixed(0) || "—"}</p>
        </div>
        {subject_price_per_sqft && (
          <div className="bg-white/5 rounded-lg px-4 py-2">
            <span className="text-slate-400 text-xs">Subject $/sqft</span>
            <p className={`font-bold ${
              subject_price_per_sqft <= median_comp_price_per_sqft ? "text-green-400"
              : subject_price_per_sqft <= median_comp_price_per_sqft * 1.15 ? "text-yellow-400"
              : "text-red-400"
            }`}>${subject_price_per_sqft?.toFixed(0)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
