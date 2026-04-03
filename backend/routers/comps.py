import os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import httpx
from flask import Blueprint, request, jsonify
from datetime import date, timedelta

comps_bp = Blueprint("comps", __name__)
ATTOM_KEY  = os.getenv("ATTOM_API_KEY", "")
ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
HDR_ATTOM  = {"apikey": ATTOM_KEY, "Accept": "application/json"}

def _mock_comps(zip_code, bedrooms, sqft, asking_price):
    rng = random.Random(str(zip_code))
    base_psqft = (asking_price / sqft) if sqft else 175.0
    streets = ["123 Maple St","456 Oak Ave","789 Elm Dr","321 Pine Rd","654 Birch Ln","987 Cedar Ct","246 Walnut Blvd","135 Ash Way"]
    comps = []
    for i, street in enumerate(streets[:8]):
        variance = rng.uniform(-0.18, 0.18)
        psqft = round(base_psqft * (1 + variance), 2)
        comp_sqft = int(sqft * rng.uniform(0.87, 1.13)) if sqft else int(rng.uniform(1200, 2200))
        sold_price = round(psqft * comp_sqft / 1000) * 1000
        sold_date = (date.today() - timedelta(days=rng.randint(14, 170))).strftime("%Y-%m-%d")
        comps.append({"address": f"{street}, City, {zip_code}", "sold_price": float(sold_price),
            "sqft": comp_sqft, "price_per_sqft": psqft, "sold_date": sold_date,
            "bedrooms": bedrooms or rng.choice([3,3,4]),
            "bathrooms": rng.choice([2.0,2.0,2.5,3.0]),
            "distance_miles": round(rng.uniform(0.1,1.5),2), "is_subject": False})
    return comps

def get_dom_sync(zip_code):
    rng = random.Random(str(zip_code))
    return {"zip_code": zip_code, "avg_dom": round(rng.uniform(18,55)), "is_mock": True}

@comps_bp.route("/api/comps/dom_average")
def dom_average():
    zip_code = request.args.get("zip_code","00000")
    return jsonify(get_dom_sync(zip_code))

@comps_bp.route("/api/comps/")
def get_comps_route():
    import asyncio
    zip_code   = request.args.get("zip_code","00000")
    bedrooms   = int(request.args.get("bedrooms",3))
    bathrooms  = float(request.args.get("bathrooms",2.0))
    sqft       = int(request.args.get("sqft",1500))
    asking     = float(request.args.get("asking_price",300000))
    result = asyncio.run(get_comps_sync(zip_code, bedrooms, bathrooms, sqft, asking))
    return jsonify(result)

async def get_comps_sync(zip_code, bedrooms, bathrooms, sqft, asking_price):
    if not ATTOM_KEY:
        return _mock_comps(zip_code, bedrooms, sqft, asking_price)
    # Try up to 12 months, then 24 months if not enough comps
    for days_back in (365, 730):
        start_date = (date.today() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                resp = await client.get(f"{ATTOM_BASE}/sale/snapshot",
                    params={"postalcode": zip_code, "startsalesearchdate": start_date, "pagesize": 100},
                    headers=HDR_ATTOM)
                if resp.status_code != 200:
                    continue
                data = resp.json()
        except Exception:
            continue
        cutoff = date.today() - timedelta(days=days_back)
        comps = []
        for p in data.get("property", []):
            try:
                building  = p.get("building", {})
                sale      = p.get("sale", {})
                amount    = sale.get("amount", {})
                rooms     = building.get("rooms", {})
                size      = building.get("size", {})
                sold_price = float(amount.get("saleamt") or 0)
                comp_sqft  = int(size.get("livingsize") or 0)
                sold_date_str = sale.get("contractDate") or sale.get("saleRecDate") or ""
                if not sold_date_str or sold_price < 50000 or comp_sqft == 0:
                    continue
                sold_dt = date.fromisoformat(sold_date_str[:10])
                if sold_dt < cutoff:
                    continue
                # Loose sqft filter — ±35% (skip only if we have sqft data)
                if sqft and comp_sqft and not (sqft * 0.65 <= comp_sqft <= sqft * 1.35):
                    continue
                # Loose bed filter — ±2 beds
                comp_beds = int(rooms.get("beds") or 0)
                if bedrooms and comp_beds and abs(comp_beds - bedrooms) > 2:
                    continue
                psqft     = round(sold_price / comp_sqft, 2)
                addr_info = p.get("address", {})
                comps.append({
                    "address":        addr_info.get("oneLine", ""),
                    "sold_price":     sold_price,
                    "sqft":           comp_sqft,
                    "price_per_sqft": psqft,
                    "sold_date":      sold_dt.strftime("%Y-%m-%d"),
                    "bedrooms":       comp_beds,
                    "bathrooms":      float(rooms.get("bathstotal") or 0),
                    "distance_miles": None,
                    "is_subject":     False,
                })
            except Exception:
                continue
        if len(comps) >= 3:
            # Sort by most recent first, return top 8
            comps.sort(key=lambda x: x["sold_date"], reverse=True)
            return comps[:8]
    return _mock_comps(zip_code, bedrooms, sqft, asking_price)
