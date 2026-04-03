import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import httpx
from flask import Blueprint, request, jsonify

neighborhood_bp = Blueprint("neighborhood", __name__)
CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5"

# B19013 = median household income
# B01003 = total population
# B25003 = housing tenure (total / owner / renter)
# B25103 = median real estate taxes paid (annual, owner-occupied w/ mortgage)
# B25077 = median value of owner-occupied housing units
CENSUS_VARS = (
    "B19013_001E,B01003_001E,"
    "B25003_001E,B25003_002E,B25003_003E,"
    "B25103_001E,B25077_001E"
)


def _mock_neighborhood(zip_code):
    import random
    rng = random.Random(str(zip_code))
    income = round(rng.uniform(42000, 95000), -2)
    population = round(rng.uniform(8000, 55000), -2)
    owner_pct = round(rng.uniform(45, 75), 1)
    return {
        "median_income": income,
        "population": int(population),
        "owner_occupied_pct": owner_pct,
        "renter_occupied_pct": round(100 - owner_pct, 1),
        "median_annual_tax": None,
        "median_home_value": None,
        "effective_tax_rate": None,
        "income_affordability_stress": False,
        "data_source": "U.S. Census Bureau ACS 5-Year (mock)",
        "is_mock": True,
    }


@neighborhood_bp.route("/api/neighborhood/")
def get_neighborhood_route():
    import asyncio
    zip_code = request.args.get("zip_code", "00000")
    asking   = float(request.args.get("asking_price", 0))
    result   = asyncio.run(get_neighborhood_sync(zip_code, asking))
    return jsonify(result)


async def get_neighborhood_sync(zip_code, asking_price=0):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                CENSUS_BASE,
                params={
                    "get": CENSUS_VARS,
                    "for": "zip code tabulation area:{}".format(zip_code),
                },
            )
            if resp.status_code != 200:
                nd = _mock_neighborhood(zip_code)
            else:
                rows = resp.json()
                if len(rows) < 2:
                    nd = _mock_neighborhood(zip_code)
                else:
                    header, values = rows[0], rows[1]
                    idx = {h: i for i, h in enumerate(header)}

                    def _safe(k):
                        try:
                            return float(values[idx[k]])
                        except Exception:
                            return 0.0

                    median_income  = _safe("B19013_001E")
                    population     = int(_safe("B01003_001E"))
                    total_housing  = _safe("B25003_001E")
                    owner_occ      = _safe("B25003_002E")
                    renter_occ     = _safe("B25003_003E")
                    median_tax     = _safe("B25103_001E")   # annual taxes paid
                    median_hv      = _safe("B25077_001E")   # median home value

                    owner_pct  = round(owner_occ / total_housing * 100, 1) if total_housing else None
                    renter_pct = round(renter_occ / total_housing * 100, 1) if total_housing else None

                    # Effective tax rate = median annual tax / median home value
                    eff_rate = None
                    if median_tax and median_hv and median_hv > 0:
                        eff_rate = round(median_tax / median_hv * 100, 3)  # as %

                    nd = {
                        "median_income":       median_income if median_income > 0 else None,
                        "population":          population if population > 0 else None,
                        "owner_occupied_pct":  owner_pct,
                        "renter_occupied_pct": renter_pct,
                        "median_annual_tax":   int(median_tax) if median_tax and median_tax > 0 else None,
                        "median_home_value":   int(median_hv)  if median_hv  and median_hv  > 0 else None,
                        "effective_tax_rate":  eff_rate,
                        "income_affordability_stress": False,
                        "data_source": "U.S. Census Bureau ACS 5-Year",
                        "is_mock": False,
                    }
    except Exception:
        nd = _mock_neighborhood(zip_code)

    if asking_price and nd.get("median_income") and nd["median_income"] > 0:
        nd["income_affordability_stress"] = (asking_price / nd["median_income"]) > 6

    # Compute estimated annual tax for the subject property using local effective rate
    if asking_price and nd.get("effective_tax_rate") and nd["effective_tax_rate"] > 0:
        nd["estimated_annual_tax"] = round(asking_price * nd["effective_tax_rate"] / 100)
    else:
        nd["estimated_annual_tax"] = None

    return nd
