import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

def _clamp(v, lo=0.0, hi=100.0): return max(lo, min(hi, v))

def _psqft_component(s, m):
    if s is None or m == 0: return 50.0
    pct = (s - m) / m * 100
    if pct <= 0: return 0.0
    if pct >= 25: return 100.0
    return _clamp(pct / 25 * 100)

def _dom_component(dom, avg):
    if dom is None or avg == 0: return 30.0
    ratio = dom / avg
    if ratio <= 1.0: return 0.0
    if ratio >= 3.0: return 100.0
    return _clamp((ratio - 1.0) / 2.0 * 100)

def _ptr_component(ptr):
    if ptr <= 0: return 50.0
    if ptr < 15: return 0.0
    if ptr <= 20: return _clamp((ptr - 15) / 5 * 50)
    if ptr <= 30: return _clamp(50 + (ptr - 20) / 10 * 50)
    return 100.0

def _reduction_component(reductions, total, asking):
    if reductions == 0: return 0.0
    if reductions >= 2: return 85.0
    if asking and asking > 0:
        pct = total / asking * 100
        if pct < 2: return 20.0
        if pct < 5: return 40.0
        return 65.0
    return 40.0

def _tax_gap_component(asking, assessed):
    if asking is None or assessed is None or assessed == 0: return 30.0
    pct = (asking - assessed) / assessed * 100
    if pct <= 10: return 0.0
    if pct <= 30: return _clamp((pct - 10) / 20 * 60)
    return _clamp(60 + (pct - 30) / 30 * 40)

def compute_valuation_score(subject_price_per_sqft, median_comp_price_per_sqft,
        days_on_market, dom_zip_average, price_to_rent_ratio,
        price_reductions, total_price_reduction, asking_price, tax_assessed_value):
    psqft  = _psqft_component(subject_price_per_sqft, median_comp_price_per_sqft)
    dom    = _dom_component(days_on_market, dom_zip_average)
    ptr    = _ptr_component(price_to_rent_ratio)
    predc  = _reduction_component(price_reductions, total_price_reduction, asking_price)
    taxgap = _tax_gap_component(asking_price, tax_assessed_value)
    score  = int(_clamp(psqft*0.40 + dom*0.20 + ptr*0.20 + predc*0.10 + taxgap*0.10))
    if score <= 30:   label, color = "Undervalued / Fair Deal", "green"
    elif score <= 60: label, color = "Fairly Priced", "yellow"
    else:             label, color = "Overvalued", "red"
    return {"score": score, "label": label, "color": color, "breakdown": {
        "psqft_score": round(psqft,1), "dom_score": round(dom,1),
        "ptr_score": round(ptr,1), "price_reduction_score": round(predc,1),
        "tax_gap_score": round(taxgap,1)}}

def compute_ptr(asking_price, monthly_rent):
    if asking_price is None or monthly_rent == 0: return 0.0
    return round(asking_price / (monthly_rent * 12), 2)

def ptr_benchmark(ptr):
    if ptr <= 0: return "unknown"
    if ptr < 15: return "buy"
    if ptr <= 20: return "neutral"
    return "rent"

def generate_flags(subject_psqft, median_comp_psqft, days_on_market, dom_zip_average,
        ptr, price_reductions, total_price_reduction, asking_price,
        tax_assessed_value, neighborhood_income):
    flags = []
    if subject_psqft and median_comp_psqft > 0:
        pct = (subject_psqft - median_comp_psqft) / median_comp_psqft * 100
        if pct > 15:
            flags.append({"type":"red","message":"Price is {:.0f}% above median comp $/sqft (${:.0f} vs ${:.0f})".format(pct, subject_psqft, median_comp_psqft),"severity":"high"})
        elif pct > 5:
            flags.append({"type":"red","message":"Price is {:.0f}% above median comp $/sqft".format(pct),"severity":"medium"})
        elif pct <= 0:
            flags.append({"type":"green","message":"Price is at or below median comp $/sqft (${:.0f} vs ${:.0f})".format(subject_psqft, median_comp_psqft),"severity":"low"})
    if days_on_market is not None and dom_zip_average > 0:
        if days_on_market > dom_zip_average * 2:
            flags.append({"type":"red","message":"Home has been on market {} days (zip avg: {:.0f} days)".format(days_on_market, dom_zip_average),"severity":"high"})
        elif days_on_market < dom_zip_average * 0.5:
            flags.append({"type":"green","message":"Selling quickly: {} days vs zip avg {:.0f}".format(days_on_market, dom_zip_average),"severity":"low"})
    if ptr > 0:
        if ptr > 20:
            flags.append({"type":"red","message":"Price-to-rent ratio of {:.1f} suggests overvaluation (>20 = rent)".format(ptr),"severity":"high"})
        elif ptr < 15:
            flags.append({"type":"green","message":"Strong buy signal: price-to-rent ratio of {:.1f} (<15 = buy)".format(ptr),"severity":"low"})
    if price_reductions >= 2:
        flags.append({"type":"red","message":"{} price reductions totaling ${:,.0f}".format(price_reductions, total_price_reduction),"severity":"high"})
    elif price_reductions == 1:
        flags.append({"type":"red","message":"One price reduction of ${:,.0f}".format(total_price_reduction),"severity":"medium"})
    elif price_reductions == 0 and asking_price:
        flags.append({"type":"green","message":"No price reductions — listed at original asking price","severity":"low"})
    if asking_price and tax_assessed_value and tax_assessed_value > 0:
        pct = (asking_price - tax_assessed_value) / tax_assessed_value * 100
        if pct > 30:
            flags.append({"type":"red","message":"Asking price is {:.0f}% above tax assessed value (${:,.0f})".format(pct, tax_assessed_value),"severity":"high"})
        elif pct > 10:
            flags.append({"type":"red","message":"Asking price is {:.0f}% above tax assessed value".format(pct),"severity":"medium"})
        elif pct <= 5:
            flags.append({"type":"green","message":"Asking price is close to or below tax assessed value","severity":"low"})
    if asking_price and neighborhood_income:
        ratio = asking_price / neighborhood_income
        if ratio > 6:
            flags.append({"type":"red","message":"Price-to-income ratio of {:.1f}x suggests affordability stress".format(ratio),"severity":"medium"})
    return flags
