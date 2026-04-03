import os, sys, csv
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import httpx
from flask import Blueprint, request, jsonify
from services.regression import compute_moving_average, linear_regression_project, project_dollar_value, yoy_change

trends_bp = Blueprint("trends", __name__)
FHFA_CSV_URL = "https://www.fhfa.gov/DataTools/Downloads/Documents/HPI/HPI_master.csv"
STATE_METRO_MAP = {"AL":"Birmingham-Hoover, AL","AZ":"Phoenix-Mesa-Scottsdale, AZ",
    "CA":"Los Angeles-Long Beach-Anaheim, CA","CO":"Denver-Aurora-Lakewood, CO",
    "FL":"Miami-Fort Lauderdale-West Palm Beach, FL","GA":"Atlanta-Sandy Springs-Roswell, GA",
    "IL":"Chicago-Naperville-Elgin, IL-IN-WI","IN":"Indianapolis-Carmel-Anderson, IN",
    "MA":"Boston-Cambridge-Newton, MA-NH","MD":"Baltimore-Columbia-Towson, MD",
    "MI":"Detroit-Warren-Dearborn, MI","MN":"Minneapolis-St. Paul-Bloomington, MN-WI",
    "MO":"St. Louis, MO-IL","NC":"Charlotte-Concord-Gastonia, NC-SC",
    "NJ":"New York-Newark-Jersey City, NY-NJ-PA","NY":"New York-Newark-Jersey City, NY-NJ-PA",
    "OH":"Columbus, OH","OR":"Portland-Vancouver-Hillsboro, OR-WA",
    "PA":"Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
    "TN":"Nashville-Davidson--Murfreesboro--Franklin, TN","TX":"Dallas-Fort Worth-Arlington, TX",
    "VA":"Washington-Arlington-Alexandria, DC-VA-MD-WV","WA":"Seattle-Tacoma-Bellevue, WA","WI":"Milwaukee-Waukesha-West Allis, WI"}

def _mock_trends(metro, asking_price):
    import random
    rng = random.Random(metro)
    base = 200.0
    points, indices = [], []
    for year in range(2019,2025):
        for q in range(1,5):
            if year==2024 and q>3: break
            base = base + rng.uniform(1.5,5.0) + rng.uniform(-2,4)
            indices.append(round(base,2))
            points.append({"date":f"{year}-Q{q}","index":round(base,2),"is_projected":False})
    ma = compute_moving_average(indices)
    for i,pt in enumerate(points): pt["moving_avg"] = ma[i]
    proj, lower, upper = linear_regression_project(indices, n_quarters_forward=12)
    current_index = indices[-1]
    start_year, start_q = 2024, 4
    for i in range(12):
        q = ((start_q-1+i)%4)+1
        yr = start_year+((start_q-1+i)//4)
        points.append({"date":f"{yr}-Q{q}","index":round(proj[i],2),"moving_avg":None,
            "is_projected":True,"lower_bound":round(lower[i],2),"upper_bound":round(upper[i],2)})
    projected_values = []
    for years_out in [1,2,3]:
        qi = years_out*4-1
        if qi < len(proj):
            ev = project_dollar_value(asking_price, current_index, [proj[qi]])[0]
            lv = project_dollar_value(asking_price, current_index, [lower[qi]])[0]
            uv = project_dollar_value(asking_price, current_index, [upper[qi]])[0]
            projected_values.append({"years_out":years_out,"index":round(proj[qi],2),
                "estimated_value":round(ev,-2),"lower_value":round(lv,-2),"upper_value":round(uv,-2)})
    return {"metro":metro,"points":points,"yoy_change":yoy_change(indices),
        "projected_values":projected_values,"data_source":"FHFA HPI (mock)","is_mock":True}

@trends_bp.route("/api/trends/")
def get_trends_route():
    import asyncio
    state        = request.args.get("state","IL")
    asking_price = float(request.args.get("asking_price",300000))
    result = asyncio.run(get_trends_sync(state, asking_price))
    return jsonify(result)

async def get_trends_sync(state, asking_price=300000):
    metro = STATE_METRO_MAP.get(state.upper(),"United States")
    metro_keyword = metro.split(",")[0].split("-")[0].strip()
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(FHFA_CSV_URL)
            resp.raise_for_status()
        lines = resp.text.splitlines()
        reader = csv.DictReader(lines)
        raw = []
        kw = metro_keyword.lower()
        for row in reader:
            if row.get("hpi_type")!="traditional" or row.get("frequency")!="quarterly" or row.get("level")!="MSA": continue
            if kw not in row.get("place_name","").lower(): continue
            try:
                raw.append({"year":int(row["yr"]),"quarter":int(row["period"]),
                    "index":float(row["index_nsa"]),"place_name":row["place_name"]})
            except: continue
        raw.sort(key=lambda x:(x["year"],x["quarter"]))
        if len(raw) < 10: return _mock_trends(metro, asking_price)
    except Exception:
        return _mock_trends(metro, asking_price)
    raw = raw[-20:]
    indices = [r["index"] for r in raw]
    ma = compute_moving_average(indices)
    points = []
    for i,r in enumerate(raw):
        points.append({"date":f"{r['year']}-Q{r['quarter']}","index":round(r["index"],2),
            "moving_avg":round(ma[i],2) if ma[i] is not None else None,"is_projected":False})
    proj, lower, upper = linear_regression_project(indices, n_quarters_forward=12)
    current_index = indices[-1]
    last = raw[-1]
    start_year, start_q = last["year"], last["quarter"]
    for i in range(12):
        total_q = (start_q-1+i+1)
        yr = start_year+total_q//4
        q = (total_q%4)+1
        points.append({"date":f"{yr}-Q{q}","index":round(proj[i],2),"is_projected":True,
            "lower_bound":round(lower[i],2),"upper_bound":round(upper[i],2)})
    projected_values = []
    for years_out in [1,2,3]:
        qi = years_out*4-1
        if qi < len(proj):
            ev = project_dollar_value(asking_price, current_index, [proj[qi]])[0]
            lv = project_dollar_value(asking_price, current_index, [lower[qi]])[0]
            uv = project_dollar_value(asking_price, current_index, [upper[qi]])[0]
            projected_values.append({"years_out":years_out,"index":round(proj[qi],2),
                "estimated_value":round(ev,-2),"lower_value":round(lv,-2),"upper_value":round(uv,-2)})
    return {"metro":raw[0]["place_name"] if raw else metro,"points":points,
        "yoy_change":yoy_change(indices),"projected_values":projected_values,
        "data_source":"FHFA House Price Index","is_mock":False}
