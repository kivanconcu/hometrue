import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery]               = useState("");
  const [suggestions, setSuggestions]   = useState([]);
  const [selected, setSelected]         = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching]         = useState(false);
  const [prefilling, setPrefilling]     = useState(false);
  const [prefilled, setPrefilled]       = useState(null); // { beds, baths, sqft, price, assessed }
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
    setPrefilling(true);
    setPrefilled(null);
    try {
      const { data } = await axios.get(`${API}/api/property/prefill`, {
        params: { address: addr.address, city: addr.city, state: addr.state, zip_code: addr.zip_code },
      });
      if (data.found) {
        setPrefilled({
          price:    data.avm_price    || null,
          beds:     data.bedrooms     || null,
          baths:    data.bathrooms    || null,
          sqft:     data.sqft         || null,
          assessed: data.assessed_value || null,
        });
      }
    } catch {
      // silent
    } finally {
      setPrefilling(false);
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setPrefilled(null);
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
      address:      parsed.address  || query.trim(),
      city:         parsed.city     || "",
      state:        parsed.state    || "US",
      zip_code:     parsed.zip_code || "00000",
      lat:          parsed.lat      || null,
      lon:          parsed.lon      || null,
      asking_price: prefilled?.price  || null,
      bedrooms:     prefilled?.beds   || null,
      bathrooms:    prefilled?.baths  || null,
      sqft:         prefilled?.sqft   || null,
    });
  }

  const isLoading = fetching || prefilling;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div ref={wrapperRef} className="relative mb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
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
              placeholder="Enter any U.S. property address..."
              className="w-full bg-white border-2 border-gray-200 focus:border-orange-400 rounded-xl pl-11 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none transition text-base shadow-sm"
            />
            {isLoading && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg className="animate-spin w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="btn-orange px-6 py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Analyzing...
              </>
            ) : "Analyze Property"}
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => handleSelect(s)}
                className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition border-b border-gray-100 last:border-0"
              >
                <p className="text-sm text-gray-900 font-medium">
                  {s.address || s.display_name.split(",")[0]}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.city}, {s.state} {s.zip_code}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Auto-fill status */}
      {prefilling && (
        <p className="text-xs text-gray-500 text-center mt-1">
          <span className="inline-flex items-center gap-1">
            <svg className="animate-spin w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Fetching property details...
          </span>
        </p>
      )}

      {prefilled && (
        <div className="mt-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl flex flex-wrap items-center gap-3 text-sm">
          <span className="text-orange-600">
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Property data auto-filled
          </span>
          {prefilled.beds && <span className="text-gray-600">{prefilled.beds} bed</span>}
          {prefilled.baths && <span className="text-gray-600">{prefilled.baths} bath</span>}
          {prefilled.sqft && <span className="text-gray-600">{prefilled.sqft.toLocaleString()} sqft</span>}
          {prefilled.price && <span className="text-gray-600">AVM: ${prefilled.price.toLocaleString()}</span>}
          {prefilled.assessed && <span className="text-gray-600">Assessed: ${prefilled.assessed.toLocaleString()}</span>}
        </div>
      )}
    </form>
  );
}
