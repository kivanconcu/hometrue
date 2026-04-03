import React from "react";
import { Link } from "react-router-dom";

export default function Report() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Report Page</h1>
        <p className="text-slate-400 mb-6">PDF reports are generated and downloaded directly from the main analysis view.</p>
        <Link to="/" className="bg-green-500 hover:bg-green-400 text-navy-900 font-bold px-6 py-3 rounded-xl transition">
          Back to Search
        </Link>
      </div>
    </div>
  );
}
