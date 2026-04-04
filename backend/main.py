"""
HomeTrue — Flask backend
Runs on port 8000.
All data from licensed/official sources only (no scraping).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import asyncio
import re
import sqlite3
import statistics
import datetime
from io import BytesIO
from functools import wraps

import bcrypt
import jwt
import httpx
from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from routers.property import property_bp, get_property_detail_sync
from routers.comps import comps_bp, get_comps_sync, get_dom_sync
from routers.trends import trends_bp, get_trends_sync
from routers.neighborhood import neighborhood_bp, get_neighborhood_sync
from services.valuation import (
    compute_valuation_score, compute_ptr, ptr_benchmark, generate_flags
)
from services.pdf_report import generate_pdf

app = Flask(__name__)

# Allow requests from localhost dev + any deployed frontend
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),
]
CORS(app, origins=[o for o in _ALLOWED_ORIGINS if o])

ATTOM_KEY     = os.getenv("ATTOM_API_KEY", "")
RENTCAST_KEY  = os.getenv("RENTCAST_API_KEY", "")
RENTCAST_BASE = "https://api.rentcast.io/v1"

app.register_blueprint(property_bp)
app.register_blueprint(comps_bp)
app.register_blueprint(trends_bp)
app.register_blueprint(neighborhood_bp)

# ─── Auth / User database ─────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "hometrue-dev-secret-change-in-prod")
DB_PATH    = os.path.join(os.path.dirname(__file__), "users.db")

PLAN_LIMITS = {
    "starter":   20,
    "pro":       200,
    "unlimited": 999999,
    "free":      3,      # trial
}

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            plan          TEXT NOT NULL DEFAULT 'free',
            searches_used INTEGER NOT NULL DEFAULT 0,
            reset_date    TEXT NOT NULL,
            created_at    TEXT NOT NULL
        )
    """)
    db.commit()
    db.close()

init_db()

def make_token(user_id):
    payload = {
        "sub": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"detail": "Unauthorized"}), 401
        token = auth[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            db = get_db()
            user = db.execute("SELECT * FROM users WHERE id=?", (payload["sub"],)).fetchone()
            db.close()
            if not user:
                return jsonify({"detail": "User not found"}), 401
            g.user = dict(user)
        except jwt.ExpiredSignatureError:
            return jsonify({"detail": "Token expired"}), 401
        except Exception:
            return jsonify({"detail": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

def _user_json(u):
    return {
        "id":           u["id"],
        "email":        u["email"],
        "plan":         u["plan"],
        "searches_used": u["searches_used"],
        "search_limit": PLAN_LIMITS.get(u["plan"], 3),
    }

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data     = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    plan     = data.get("plan", "free")
    if not email or not password:
        return jsonify({"detail": "Email and password required"}), 400
    if len(password) < 8:
        return jsonify({"detail": "Password must be at least 8 characters"}), 400
    if plan not in PLAN_LIMITS:
        plan = "free"
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    now     = datetime.datetime.utcnow().isoformat()
    db      = get_db()
    try:
        cur = db.execute(
            "INSERT INTO users (email, password_hash, plan, searches_used, reset_date, created_at) VALUES (?,?,?,0,?,?)",
            (email, pw_hash, plan, now, now)
        )
        db.commit()
        user = db.execute("SELECT * FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
        token = make_token(user["id"])
        return jsonify({"token": token, "user": _user_json(dict(user))}), 201
    except sqlite3.IntegrityError:
        return jsonify({"detail": "An account with this email already exists"}), 409
    finally:
        db.close()

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data     = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    db       = get_db()
    user     = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    db.close()
    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify({"detail": "Invalid email or password"}), 401
    token = make_token(user["id"])
    return jsonify({"token": token, "user": _user_json(dict(user))})

@app.route("/api/auth/me", methods=["GET"])
@require_auth
def auth_me():
    return jsonify(g.user if isinstance(g.user, dict) else _user_json(g.user))


# ─── Property pre-fill via RentCast (replaces Zillow scraping) ───────────────

async def _fetch_rentcast_property(address, city, state, zip_code):
    """
    Use RentCast /v1/properties + /v1/avm/value to get property details and AVM price.
    Returns dict with avm_price, bedrooms, bathrooms, sqft, year_built, assessed_value or None.
    """
    if not RENTCAST_KEY:
        return None
    full_address = "{}, {}, {} {}".format(address, city, state, zip_code).strip(", ")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Fetch property details and AVM in parallel
            prop_resp, avm_resp = await asyncio.gather(
                client.get(
                    "{}/properties".format(RENTCAST_BASE),
                    params={"address": full_address},
                    headers={"X-Api-Key": RENTCAST_KEY},
                ),
                client.get(
                    "{}/avm/value".format(RENTCAST_BASE),
                    params={"address": full_address},
                    headers={"X-Api-Key": RENTCAST_KEY},
                ),
            )

            data = {}
            if prop_resp.status_code == 200:
                raw = prop_resp.json()
                data = raw[0] if isinstance(raw, list) and raw else (raw if isinstance(raw, dict) else {})

            avm_price = None
            if avm_resp.status_code == 200:
                avm_data  = avm_resp.json()
                avm_price = avm_data.get("price") or avm_data.get("value") or avm_data.get("priceRangeLow")

            if not data and not avm_price:
                return None

            # Extract assessed value — RentCast nests it under assessments dict
            assessed = None
            assessments = data.get("assessments") or {}
            if assessments:
                # Get most recent year
                latest = max(assessments.keys()) if assessments else None
                if latest:
                    assessed = (assessments[latest].get("value")
                                or assessments[latest].get("totalValue"))
            if not assessed:
                assessed = (data.get("assessedValue")
                            or data.get("taxAssessedValue")
                            or data.get("taxAssessment"))

            result = {
                "bedrooms":       data.get("bedrooms"),
                "bathrooms":      data.get("bathrooms"),
                "sqft":           data.get("squareFootage") or data.get("livingArea"),
                "year_built":     data.get("yearBuilt"),
                "lot_size":       data.get("lotSize"),
                "property_type":  data.get("propertyType", "Single Family"),
                "assessed_value": assessed,
                "lat":            data.get("latitude"),
                "lon":            data.get("longitude"),
            }
            # AVM price from /avm/value takes priority; fall back to last sale
            result["avm_price"] = (avm_price
                                   or data.get("price")
                                   or data.get("lastSalePrice"))
            return {k: v for k, v in result.items() if v is not None}
    except Exception:
        pass
    return None


@app.route("/api/debug/rentcast")
def debug_rentcast():
    """Temporary debug endpoint — shows raw RentCast response."""
    address  = request.args.get("address", "")
    city     = request.args.get("city", "")
    state    = request.args.get("state", "")
    zip_code = request.args.get("zip_code", "")
    full_address = "{}, {}, {} {}".format(address, city, state, zip_code).strip(", ")

    async def _fetch():
        async with httpx.AsyncClient(timeout=10) as client:
            prop_resp, avm_resp = await asyncio.gather(
                client.get("{}/properties".format(RENTCAST_BASE),
                    params={"address": full_address},
                    headers={"X-Api-Key": RENTCAST_KEY}),
                client.get("{}/avm/value".format(RENTCAST_BASE),
                    params={"address": full_address},
                    headers={"X-Api-Key": RENTCAST_KEY}),
            )
            return {
                "full_address": full_address,
                "properties_status": prop_resp.status_code,
                "properties_raw": prop_resp.json() if prop_resp.status_code == 200 else prop_resp.text,
                "avm_status": avm_resp.status_code,
                "avm_raw": avm_resp.json() if avm_resp.status_code == 200 else avm_resp.text,
            }
    result = asyncio.run(_fetch())
    return jsonify(result)


@app.route("/api/property/prefill")
def property_prefill():
    """
    Pre-fill property details for the search form.
    Uses RentCast /v1/properties (licensed data, no scraping).
    """
    address  = request.args.get("address", "")
    city     = request.args.get("city", "")
    state    = request.args.get("state", "")
    zip_code = request.args.get("zip_code", "")
    if not address:
        return jsonify({"found": False}), 200
    try:
        result = asyncio.run(_fetch_rentcast_property(address, city, state, zip_code))
    except Exception:
        result = None
    if not result:
        return jsonify({"found": False}), 200
    result["found"] = True
    return jsonify(result)


# ─── Rent helpers ─────────────────────────────────────────────────────────────

def _heuristic_rent(zip_code, bedrooms):
    import random
    rng = random.Random(str(zip_code))
    base = rng.uniform(900, 2200)
    per_bed = {1: 0.8, 2: 1.0, 3: 1.25, 4: 1.5, 5: 1.8}
    mult = per_bed.get(int(bedrooms or 3), 1.25)
    return round(base * mult, -1)


async def _fetch_rentcast_rent(address, city, state, zip_code, bedrooms, bathrooms):
    """RentCast AVM rent estimate."""
    if not RENTCAST_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "{}/avm/rent/long-term".format(RENTCAST_BASE),
                params={
                    "address":      address,
                    "city":         city,
                    "state":        state,
                    "zipCode":      zip_code,
                    "propertyType": "Single Family",
                    "bedrooms":     int(bedrooms or 3),
                    "bathrooms":    float(bathrooms or 2.0),
                },
                headers={"X-Api-Key": RENTCAST_KEY},
            )
            if resp.status_code == 200:
                data = resp.json()
                rent = data.get("rent") or data.get("rentZestimate") or 0
                if float(rent) > 0:
                    return float(rent)
    except Exception:
        pass
    return None


async def _fetch_census_rent(zip_code, bedrooms):
    """
    Census ACS 5-Year median gross rent by bedroom count.
    B25031_002E=studio, _003E=1BR, _004E=2BR, _005E=3BR, _006E=4BR
    """
    try:
        beds = int(bedrooms or 3)
        bed_var = {0: "B25031_002E", 1: "B25031_003E", 2: "B25031_004E",
                   3: "B25031_005E", 4: "B25031_006E"}.get(beds, "B25031_005E")
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.census.gov/data/2022/acs/acs5",
                params={
                    "get": bed_var,
                    "for": "zip code tabulation area:{}".format(zip_code),
                },
            )
            if resp.status_code == 200:
                rows = resp.json()
                if len(rows) >= 2:
                    val = float(rows[1][0])
                    if val > 0:
                        return val
    except Exception:
        pass
    return None


async def _fetch_hud_fmr(zip_code, bedrooms):
    """HUD Fair Market Rents via Census geocoder → county FIPS → HUD API."""
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            geo = await client.get(
                "https://geocoding.geo.census.gov/geocoder/geographies/address",
                params={
                    "street":    "1 Main St",
                    "zip":       zip_code,
                    "benchmark": "Public_AR_Current",
                    "vintage":   "Current_Current",
                    "format":    "json",
                },
            )
            if geo.status_code != 200:
                return None
            matches = geo.json().get("result", {}).get("addressMatches", [])
            if not matches:
                return None
            counties = matches[0].get("geographies", {}).get("Counties", [])
            if not counties:
                return None
            fips = counties[0].get("GEOID", "")
            if not fips:
                return None
            hud = await client.get(
                "https://www.huduser.gov/hudapi/public/fmr/data/{}".format(fips),
                params={"year": "2025"},
            )
            if hud.status_code != 200:
                return None
            bed_map = {0: "Efficiency", 1: "One-Bedroom", 2: "Two-Bedroom",
                       3: "Three-Bedroom", 4: "Four-Bedroom"}
            bed_key = bed_map.get(int(bedrooms or 3), "Three-Bedroom")
            basic = hud.json().get("data", {}).get("basicdata", {})
            fmr = basic.get(bed_key)
            if fmr and float(fmr) > 0:
                return float(fmr)
    except Exception:
        pass
    return None


async def _fetch_rent(address, city, state, zip_code, bedrooms, bathrooms):
    """
    Rent estimate chain (all licensed/official sources):
      1. RentCast AVM           (licensed data, most accurate)
      2. Census ACS median rent by bedroom (free govt, ZIP-level)
      3. HUD Fair Market Rents  (free govt, county-level)
      4. Heuristic fallback
    Returns (rent_estimate, source_label)
    """
    rent = await _fetch_rentcast_rent(address, city, state, zip_code, bedrooms, bathrooms)
    if rent:
        return rent, "RentCast AVM"

    rent = await _fetch_census_rent(zip_code, bedrooms)
    if rent:
        return rent, "U.S. Census ACS (median rent by ZIP)"

    rent = await _fetch_hud_fmr(zip_code, bedrooms)
    if rent:
        return rent, "HUD Fair Market Rents"

    return _heuristic_rent(zip_code, bedrooms), "Estimated (heuristic)"


# ─── Tax assessed value via RentCast /properties ─────────────────────────────

async def _fetch_rentcast_assessed(address, city, state, zip_code):
    """RentCast /v1/properties — returns county-record assessed value."""
    if not RENTCAST_KEY:
        return None
    full_address = "{}, {}, {} {}".format(address, city, state, zip_code).strip(", ")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "{}/properties".format(RENTCAST_BASE),
                params={"address": full_address},
                headers={"X-Api-Key": RENTCAST_KEY},
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    data = data[0] if data else {}
                # Check nested assessments first
                assessments = data.get("assessments") or {}
                val = None
                if assessments:
                    latest = max(assessments.keys()) if assessments else None
                    if latest:
                        val = (assessments[latest].get("value")
                               or assessments[latest].get("totalValue"))
                if not val:
                    val = data.get("assessedValue") or data.get("taxAssessedValue") or data.get("taxAssessment")
                if val and float(val) > 0:
                    return float(val)
    except Exception:
        pass
    return None


# ─── Main analyze endpoint ────────────────────────────────────────────────────

@app.route("/api/analyze", methods=["POST"])
def analyze():
    req = request.get_json()
    if not req:
        return jsonify({"error": "No JSON body"}), 400

    address   = req.get("address", "")
    city      = req.get("city", "")
    state     = req.get("state", "US")
    zip_code  = req.get("zip_code", "00000")
    lat       = req.get("lat")
    lon       = req.get("lon")
    asking    = req.get("asking_price")
    bedrooms  = req.get("bedrooms", 3)
    bathrooms = req.get("bathrooms", 2.0)
    sqft      = req.get("sqft", 1500)

    async def _gather():
        return await asyncio.gather(
            get_property_detail_sync(address, city, state, zip_code),
            get_comps_sync(zip_code, bedrooms or 3, bathrooms or 2.0, sqft or 1500, asking or 300000),
            get_neighborhood_sync(zip_code, asking or 0),
            get_trends_sync(state, asking or 300000),
            _fetch_rent(address, city, state, zip_code, bedrooms or 3, bathrooms or 2.0),
            _fetch_rentcast_assessed(address, city, state, zip_code),
            _fetch_rentcast_property(address, city, state, zip_code),
        )

    prop, comps, neighborhood, trends, rent_result, rc_assessed, rc_prop = asyncio.run(_gather())
    monthly_rent, rent_source = rent_result if isinstance(rent_result, tuple) else (rent_result, "Unknown")
    dom_data = get_dom_sync(zip_code)

    # ── Merge RentCast property data (fill gaps only) ──
    if rc_prop:
        if not prop.get("bedrooms") and rc_prop.get("bedrooms"):
            prop["bedrooms"] = rc_prop["bedrooms"]
        if not prop.get("bathrooms") and rc_prop.get("bathrooms"):
            prop["bathrooms"] = rc_prop["bathrooms"]
        if not prop.get("sqft") and rc_prop.get("sqft"):
            prop["sqft"] = rc_prop["sqft"]
        if not prop.get("year_built") and rc_prop.get("year_built"):
            prop["year_built"] = rc_prop["year_built"]
        if not prop.get("lat") and rc_prop.get("lat"):
            prop["lat"] = rc_prop["lat"]
            prop["lon"] = rc_prop["lon"]
        # RentCast AVM price — only use if user didn't supply asking price
        if not asking and rc_prop.get("avm_price"):
            prop["asking_price"] = rc_prop["avm_price"]
            prop["list_price"]   = rc_prop["avm_price"]
            prop["is_mock"] = False
        elif rc_prop.get("bedrooms"):
            prop["is_mock"] = False

    # ── User-supplied fields always override everything ──
    if asking:    prop["asking_price"] = asking
    if bedrooms:  prop["bedrooms"]     = bedrooms
    if bathrooms: prop["bathrooms"]    = bathrooms
    if sqft:      prop["sqft"]         = sqft
    if lat:       prop["lat"]          = lat
    if lon:       prop["lon"]          = lon
    prop["city"]  = city  or prop.get("city", "")
    prop["state"] = state or prop.get("state", "")

    dom_zip_avg = float(dom_data.get("avg_dom", 30))
    ask_price   = prop.get("asking_price")

    # ── Tax assessed value: RentCast → ATTOM → Census ACS estimate ──
    if rc_assessed and rc_assessed > 0:
        prop["tax_assessed_value"] = rc_assessed
        prop["tax_source"] = "RentCast (county records)"
    elif prop.get("tax_assessed_value") and not prop.get("is_mock"):
        prop["tax_source"] = "ATTOM"
    else:
        eff_rate = neighborhood.get("effective_tax_rate")
        if eff_rate and ask_price:
            prop["tax_assessed_value"] = round(ask_price * 0.85)
            prop["tax_source"] = "Estimated (Census ACS {:.2f}% local rate)".format(eff_rate)
        else:
            prop["tax_assessed_value"] = None
            prop["tax_source"] = "Not available — check county assessor"

    prop_sqft     = prop.get("sqft")
    subject_psqft = round(ask_price / prop_sqft, 2) if ask_price and prop_sqft else None
    comp_psqfts   = [c["price_per_sqft"] for c in comps if c.get("price_per_sqft", 0) > 0]
    avg_psqft     = round(statistics.mean(comp_psqfts), 2)    if comp_psqfts else 0.0
    median_psqft  = round(statistics.median(comp_psqfts), 2)  if comp_psqfts else 0.0

    ptr       = compute_ptr(ask_price, monthly_rent)
    ptr_bench = ptr_benchmark(ptr)

    valuation = compute_valuation_score(
        subject_price_per_sqft=subject_psqft,
        median_comp_price_per_sqft=median_psqft,
        days_on_market=prop.get("days_on_market"),
        dom_zip_average=dom_zip_avg,
        price_to_rent_ratio=ptr,
        price_reductions=prop.get("price_reductions", 0),
        total_price_reduction=prop.get("total_price_reduction", 0.0),
        asking_price=ask_price,
        tax_assessed_value=prop.get("tax_assessed_value"),
    )

    raw_flags = generate_flags(
        subject_psqft=subject_psqft,
        median_comp_psqft=median_psqft,
        days_on_market=prop.get("days_on_market"),
        dom_zip_average=dom_zip_avg,
        ptr=ptr,
        price_reductions=prop.get("price_reductions", 0),
        total_price_reduction=prop.get("total_price_reduction", 0.0),
        asking_price=ask_price,
        tax_assessed_value=prop.get("tax_assessed_value"),
        neighborhood_income=neighborhood.get("median_income"),
    )

    # Only show "Mock Data" if we truly have no real data to work with.
    # If the user supplied an asking price, the analysis is real regardless of ATTOM.
    prop_is_mock = prop.get("is_mock") and not asking
    is_mock = prop_is_mock or neighborhood.get("is_mock") or trends.get("is_mock")

    return jsonify({
        "property":               prop,
        "comps":                  comps,
        "valuation_score":        valuation,
        "neighborhood":           neighborhood,
        "trends":                 trends,
        "price_to_rent_ratio":    ptr,
        "monthly_rent_estimate":  monthly_rent,
        "rent_source":            rent_source,
        "ptr_benchmark":          ptr_bench,
        "avg_comp_price_per_sqft":    avg_psqft,
        "median_comp_price_per_sqft": median_psqft,
        "subject_price_per_sqft":     subject_psqft,
        "dom_zip_average":        dom_zip_avg,
        "estimated_annual_tax":   neighborhood.get("estimated_annual_tax"),
        "effective_tax_rate":     neighborhood.get("effective_tax_rate"),
        "tax_source":             prop.get("tax_source"),
        "flags":                  raw_flags,
        "is_mock":                is_mock,
        "disclaimer": "Some data uses estimated values. Results are for informational purposes only." if is_mock else None,
    })


@app.route("/api/report", methods=["POST"])
def report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    try:
        pdf_bytes = generate_pdf(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name="HomeTrue_Report.pdf",
    )


@app.route("/api/health")
def health():
    return jsonify({
        "status":              "ok",
        "attom_configured":    bool(ATTOM_KEY),
        "rentcast_configured": bool(RENTCAST_KEY),
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
