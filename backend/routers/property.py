import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import httpx
from flask import Blueprint, request, jsonify

property_bp  = Blueprint("property", __name__)
ATTOM_KEY    = os.getenv("ATTOM_API_KEY", "")
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")
ATTOM_BASE   = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
NOMINATIM    = "https://nominatim.openstreetmap.org"
HDR_ATTOM    = {"apikey": ATTOM_KEY, "Accept": "application/json"}
HDR_NOM      = {"User-Agent": "HomeTrue/1.0 (homequeryapp@example.com)"}


def _mock_detail(address, zip_code):
    """Return a minimal shell — no fabricated property values."""
    return {
        "address": address, "city": "", "state": "",
        "zip_code": zip_code, "lat": None, "lon": None,
        "bedrooms": None, "bathrooms": None, "sqft": None,
        "year_built": None, "lot_size": None,
        "asking_price": None, "list_price": None,
        "days_on_market": None, "price_reductions": 0,
        "total_price_reduction": 0.0,
        "tax_assessed_value": None,
        "property_type": "Single Family", "is_mock": True,
    }


@property_bp.route("/api/property/autocomplete")
def autocomplete():
    import asyncio
    q = request.args.get("q", "")
    if len(q) < 4:
        return jsonify([])

    async def _fetch():
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                "{}/search".format(NOMINATIM),
                params={"q": q, "format": "json", "addressdetails": 1,
                        "limit": 7, "countrycodes": "us"},
                headers=HDR_NOM,
            )
            return resp.json() if resp.status_code == 200 else []

    try:
        results = asyncio.run(_fetch())
    except Exception:
        return jsonify([])

    suggestions = []
    for r in results:
        addr = r.get("address", {})
        zip_ = addr.get("postcode", "")
        if not zip_:
            continue
        house = addr.get("house_number", "")
        road  = addr.get("road", "")
        city  = addr.get("city") or addr.get("town") or addr.get("village") or ""
        suggestions.append({
            "display_name": r.get("display_name", ""),
            "address": "{} {}".format(house, road).strip(),
            "city": city,
            "state": addr.get("state", ""),
            "zip_code": zip_,
            "lat": float(r.get("lat", 0)),
            "lon": float(r.get("lon", 0)),
        })
    return jsonify(suggestions)


async def get_property_detail_sync(address, city, state, zip_code):
    """
    Fetch property detail from ATTOM.
    Tax assessed value is intentionally left for Rentcast in main.py,
    which has more current county-record data.
    Falls back to mock if ATTOM key missing or API fails.
    """
    if not ATTOM_KEY:
        d = _mock_detail(address, zip_code)
        d["city"] = city or d["city"]
        d["state"] = state or d["state"]
        return d
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # ATTOM requires address1 (street) + address2 (city, state zip)
            address2 = "{}, {} {}".format(city, state, zip_code).strip(", ")
            resp = await client.get(
                "{}/property/detail".format(ATTOM_BASE),
                params={"address1": address, "address2": address2},
                headers=HDR_ATTOM,
            )
            if resp.status_code != 200:
                d = _mock_detail(address, zip_code)
                d["city"] = city or d["city"]
                d["state"] = state or d["state"]
                return d
            data = resp.json()
    except Exception:
        d = _mock_detail(address, zip_code)
        d["city"] = city or d["city"]
        d["state"] = state or d["state"]
        return d

    props = data.get("property", [])
    if not props:
        d = _mock_detail(address, zip_code)
        d["city"] = city or d["city"]
        d["state"] = state or d["state"]
        return d

    p        = props[0]
    building = p.get("building", {})
    rooms    = building.get("rooms", {})
    size_info= building.get("size", {})
    location = p.get("location", {})
    amount   = p.get("sale", {}).get("amount", {})
    assessed = p.get("assessment", {}).get("assessed", {})
    addr_info= p.get("address", {})

    return {
        "address":   addr_info.get("line1", address),
        "city":      addr_info.get("locality", city),
        "state":     addr_info.get("countrySubd", state),
        "zip_code":  addr_info.get("postal1", zip_code),
        "lat":       float(location.get("latitude")  or 0) or None,
        "lon":       float(location.get("longitude") or 0) or None,
        "bedrooms":  int(rooms.get("beds") or 0)          or None,
        "bathrooms": float(rooms.get("bathstotal") or 0)  or None,
        "sqft":      int(size_info.get("livingsize") or 0) or None,
        "year_built":int(building.get("yearbuilt") or 0)  or None,
        "lot_size":  None,
        "asking_price":          float(amount.get("saleamt") or 0) or None,
        "list_price":            float(amount.get("saleamt") or 0) or None,
        "days_on_market":        None,
        "price_reductions":      0,
        "total_price_reduction": 0.0,
        "tax_assessed_value":    float(assessed.get("assdttlvalue") or 0) or None,
        "property_type":         building.get("bldgtype", "Single Family"),
        "is_mock": False,
    }
