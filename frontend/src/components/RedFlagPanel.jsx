import React from "react";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function RedFlagPanel({ flags }) {
  if (!flags?.length) return (
    <p className="text-slate-400 text-sm">No flags detected.</p>
  );

  const red = flags.filter(f => f.type === "red").sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
  );
  const green = flags.filter(f => f.type === "green").sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
  );

  function SeverityDot({ s }) {
    const colors = { high: "bg-red-500", medium: "bg-orange-400", low: "bg-yellow-400" };
    return <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${colors[s] || "bg-slate-400"}`} />;
  }

  return (
    <div className="space-y-4">
      {red.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {red.length} Red Flag{red.length !== 1 ? "s" : ""}
          </h4>
          <ul className="space-y-2">
            {red.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <SeverityDot s={f.severity} />
                <span className="text-sm text-red-200 leading-snug">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {green.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {green.length} Green Flag{green.length !== 1 ? "s" : ""}
          </h4>
          <ul className="space-y-2">
            {green.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                <span className="text-sm text-green-200 leading-snug">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
