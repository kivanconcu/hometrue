import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [price, setPrice]   = useState("");
  const [beds, setBeds]     = useState("");
  const [baths, setBaths]   = useState("");
  const [sqft, setSqft]     = useState("");
  const [zestimate, setZestimate]   = useState(null);
  const [fetchingZillow, setFetchingZillow] = useState(false);
  const [fetching, setFetching]   = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 4) { setSuggestions([]); return; }
    setFetching(true);
    try {
      const { data } = await axios.get(`${API}/api/property/autocomplete`, { params: { q } });
      setSuggestions(data || []);
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  async function prefillFromRentcast(addr) {
    if (!addr.address) return;
    setFetchingZillow(true);
    setZestimate(null);
    try {
      const { data } = await axios.get(`${API}/api/property/prefill`, {
        params: {
          address:  addr.address,
          city:     addr.city,
          state:    addr.state,
          zip_code: addr.zip_code,
        },
      });
      if (data.found) {
        if (data.avm_price) setPrice(String(data.avm_price));
        if (data.bedrooms)  setBeds(String(data.bedrooms));
        if (data.bathrooms) setBaths(String(data.bathrooms));
        if (data.sqft)      setSqft(String(data.sqft));
        if (data.assessed_value) setZestimate(data.assessed_value);
      }
    } catch {
      // silent
    } finally {
      setFetchingZillow(false);
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setZestimate(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  function handleSelect(s) {
    setSelected(s);
    setQuery(s.display_name.split(",").slice(0, 3).join(","));
    setShowDropdown(false);
    setSuggestions([]);
    prefillFromRentcast(s);
  }

  function parseManualAddress(raw) {
    const zipMatch   = raw.match(/\b(\d{5})\b/);
    const zip        = zipMatch ? zipMatch[1] : "00000";
    const stateMatch = raw.match(/,?\s*([A-Z]{2})\s*\d{5}/) || raw.match(/,\s*([A-Z]{2})\s*$/);
    const state      = stateMatch ? stateMatch[1] : "US";
    const street     = raw.split(",")[0].trim();
    const parts      = raw.split(",");
    const city       = parts.length > 1 ? parts[1].trim() : "";
    return { address: street, city, state, zip_code: zip, lat: null, lon: null };
  }

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = selected || parseManualAddress(query);
    if (!parsed.address && !query.trim()) return;
    onSearch({
      address:      parsed.address || query.trim(),
      city:         parsed.city    || "",
      state:        parsed.state   || "US",
      zip_code:     parsed.zip_code || "00000",
      lat:          parsed.lat  || null,
      lon:          parsed.lon  || null,
      asking_price: price ? parseFloat(price.replace(/,/g, "")) : null,
      bedrooms:     beds  ? parseInt(beds)  : null,
      bathrooms:    baths ? parseFloat(baths) : null,
      sqft:         sqft  ? parseInt(sqft.replace(/,/g, "")) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      {/* Address input */}
      <div ref={wrapperRef} className="relative mb-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => suggestions.length && setShowDropdown(true)}
            placeholder="Enter a property address or ZIP code..."
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-base"
          />
          {(fetching || fetchingZillow) && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {fetchingZillow && <span className="text-xs text-slate-400">Fetching Zillow…</span>}
            </span>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 top-full mt-1 w-full bg-navy-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => handleSelect(s)}
                className="px-4 py-3 hover:bg-white/10 cursor-pointer transition border-b border-white/5 last:border-0"
              >
                <p className="text-sm text-white font-medium">
                  {s.address || s.display_name.split(",")[0]}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {s.city}, {s.state} {s.zip_code}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Zillow Zestimate preview */}
      {zestimate && (
        <div className="mb-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
          <span className="text-blue-200">
            Assessed Value: <strong className="text-white">${zestimate.toLocaleString()}</strong>
            <span className="text-slate-400 ml-2">— property details pre-filled from RentCast</span>
          </span>
        </div>
      )}

      {/* Details row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Asking Price ($)", val: price, set: setPrice, ph: "e.g. 350000" },
          { label: "Bedrooms",         val: beds,  set: setBeds,  ph: "e.g. 3" },
          { label: "Bathrooms",        val: baths, set: setBaths, ph: "e.g. 2" },
          { label: "Sq Ft",            val: sqft,  set: setSqft,  ph: "e.g. 1800" },
        ].map(({ label, val, set, ph }) => (
          <div key={label}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <input
              type="text"
              value={val}
              onChange={(e) => set(e.target.value)}
              placeholder={ph}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={!query.trim() || loading}
        className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-navy-900 font-bold py-4 rounded-xl transition-all duration-150 text-base flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Analyzing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Run Full Valuation
          </>
        )}
      </button>
    </form>
  );
}
