import React, { useState, useEffect } from "react";

function fmt(n) {
  if (n == null || isNaN(n)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function InputField({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition"
        />
      </div>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function ARVCalculator({ medianCompPrice, askingPrice }) {
  const suggestedARV = medianCompPrice || askingPrice || "";

  const [arv, setArv] = useState(suggestedARV ? String(Math.round(suggestedARV)) : "");
  const [repairCosts, setRepairCosts] = useState("");
  const [assignmentFee, setAssignmentFee] = useState("");
  const [maoPct, setMaoPct] = useState(70);

  // Update ARV if prop changes
  useEffect(() => {
    if (suggestedARV && !arv) setArv(String(Math.round(suggestedARV)));
  }, [suggestedARV]);

  const arvNum = parseFloat(arv) || 0;
  const repairNum = parseFloat(repairCosts) || 0;
  const assignNum = parseFloat(assignmentFee) || 0;
  const pct = maoPct / 100;

  // Formulas
  const salePriceToBuyer = arvNum * pct - repairNum;
  const maoToSeller = salePriceToBuyer - assignNum;
  const wholesalerProfit = assignNum;
  const endBuyerEquity = arvNum - salePriceToBuyer - repairNum;

  const maoColor = maoToSeller <= 0 ? "text-red-400" : maoToSeller < arvNum * 0.5 ? "text-green-400" : "text-yellow-400";
  const isValid = arvNum > 0;

  return (
    <div>
      <p className="text-slate-400 text-sm mb-5 leading-relaxed">
        Adjust repair costs, assignment fees, and MAO percentage to calculate your offer to the seller and sale price to the buyer.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <InputField
          label="After Repair Value (ARV)"
          value={arv}
          onChange={setArv}
          hint={medianCompPrice ? `Pre-filled from median comp: $${Math.round(medianCompPrice).toLocaleString()}` : "Estimated value after repairs"}
        />
        <InputField
          label="Repair / Rehab Costs"
          value={repairCosts}
          onChange={setRepairCosts}
          hint="Total estimated cost of repairs"
        />
        <InputField
          label="Assignment Fee (Wholesaler)"
          value={assignmentFee}
          onChange={setAssignmentFee}
          hint="Your fee for assigning the contract"
        />
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">
            MAO Percentage — <span className="text-green-400 font-bold">{maoPct}%</span>
          </label>
          <input
            type="range"
            min={50}
            max={85}
            step={1}
            value={maoPct}
            onChange={e => setMaoPct(Number(e.target.value))}
            className="w-full accent-green-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>50% (conservative)</span>
            <span>70% (standard)</span>
            <span>85% (aggressive)</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={`rounded-xl border p-5 transition-opacity ${isValid ? "opacity-100" : "opacity-40"}`}
           style={{ background: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.2)" }}>
        <p className="text-xs text-green-400 uppercase tracking-widest font-semibold mb-4">Calculated Results</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="text-center bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">ARV</p>
            <p className="text-lg font-black text-white">{isValid ? fmt(arvNum) : "—"}</p>
          </div>
          <div className="text-center bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Sale Price to Buyer</p>
            <p className={`text-lg font-black ${salePriceToBuyer > 0 ? "text-yellow-300" : "text-red-400"}`}>
              {isValid ? fmt(salePriceToBuyer) : "—"}
            </p>
          </div>
          <div className="text-center bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Offer to Seller (MAO)</p>
            <p className={`text-lg font-black ${maoColor}`}>{isValid ? fmt(maoToSeller) : "—"}</p>
          </div>
          <div className="text-center bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Your Assignment Fee</p>
            <p className="text-lg font-black text-green-400">{isValid ? fmt(wholesalerProfit) : "—"}</p>
          </div>
        </div>

        {/* Formula breakdown */}
        <div className="bg-white/5 rounded-xl p-4 text-xs text-slate-400 space-y-1.5 font-mono">
          <p className="text-slate-300 font-sans font-semibold text-xs mb-2">Formula Breakdown</p>
          <p>Sale Price to Buyer = ARV × {maoPct}% − Repair Costs</p>
          <p className="text-slate-500">= {isValid ? fmt(arvNum) : "ARV"} × {maoPct}% − {fmt(repairNum)} = <span className="text-yellow-300">{isValid ? fmt(salePriceToBuyer) : "—"}</span></p>
          <div className="border-t border-white/10 my-2" />
          <p>Offer to Seller (MAO) = Sale Price − Assignment Fee</p>
          <p className="text-slate-500">= {isValid ? fmt(salePriceToBuyer) : "—"} − {fmt(assignNum)} = <span className={maoColor}>{isValid ? fmt(maoToSeller) : "—"}</span></p>
        </div>

        {isValid && maoToSeller > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="badge-green text-xs">
              End buyer equity: {fmt(endBuyerEquity)} ({arvNum > 0 ? ((endBuyerEquity / arvNum) * 100).toFixed(0) : 0}% of ARV)
            </div>
            {maoToSeller < askingPrice && (
              <div className="badge-yellow text-xs">
                MAO is ${Math.round(askingPrice - maoToSeller).toLocaleString()} below asking price
              </div>
            )}
          </div>
        )}

        {isValid && maoToSeller <= 0 && (
          <div className="mt-4 badge-red text-xs">
            Deal doesn't work at these numbers — lower repair costs or raise MAO %
          </div>
        )}
      </div>
    </div>
  );
}
