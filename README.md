# HomeTrue — Home Valuation Analysis

A full-stack web app that produces comprehensive property valuation reports from any U.S. address.

## Tech Stack

- **Backend:** Python 3.11 · FastAPI · httpx · NumPy · ReportLab
- **Frontend:** React 18 · Tailwind CSS · Recharts · Axios
- **Data Sources:**
  - [ATTOM Data API](https://api.developer.attomdata.com) — property details + comparable sales
  - [Rentcast API](https://developers.rentcast.io) — rent estimates
  - [U.S. Census Bureau ACS](https://api.census.gov) — neighborhood demographics (no key required)
  - [FHFA House Price Index](https://www.fhfa.gov) — metro price trends (no key required)
  - [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) — address autocomplete (no key required)

---

## Quick Start (without Docker)

### 1. Backend

```bash
cd hometrue/backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd hometrue/frontend
npm install
npm start
```

The app will open at `http://localhost:3000`.

---

## Environment Variables

The `.env` file lives in the project root (`hometrue/.env`):

```env
ATTOM_API_KEY=your_attom_key_here
RENTCAST_API_KEY=your_rentcast_key_here
```

The backend loads it automatically via `python-dotenv`. If keys are missing, all sections fall back to realistic mock data with a visible disclaimer banner.

---

## Docker (optional)

```bash
cd hometrue
docker-compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

---

## Features

| Feature | Description |
|---|---|
| Address autocomplete | OpenStreetMap Nominatim suggestions as you type |
| Property details | Beds, baths, sqft, year, DOM, tax assessed value |
| Overvaluation Score | 0–100 composite score with breakdown gauge |
| CMA table | Sortable table of 5–10 comparable sold homes |
| $/sqft chart | Color-coded bar chart vs. comp median |
| Price-to-Rent ratio | Buy/neutral/rent signal |
| DOM analysis | Days-on-market vs. ZIP average |
| FHFA price trends | 5-year historical HPI with moving average |
| Price projections | 1/2/3-year forecast via linear regression with confidence band |
| Neighborhood signals | Census income, population, owner/renter ratio |
| Red & green flags | Auto-generated alert list |
| PDF report | Full printable report via ReportLab |

---

## Project Structure

```
hometrue/
├── .env                        # API keys
├── docker-compose.yml
├── backend/
│   ├── main.py                 # FastAPI app + /api/analyze endpoint
│   ├── models.py               # Pydantic models
│   ├── requirements.txt
│   ├── routers/
│   │   ├── property.py         # ATTOM + Nominatim
│   │   ├── comps.py            # CMA from ATTOM
│   │   ├── trends.py           # FHFA HPI + projections
│   │   └── neighborhood.py     # Census Bureau
│   └── services/
│       ├── valuation.py        # Overvaluation score engine
│       ├── regression.py       # Linear regression for projections
│       └── pdf_report.py       # ReportLab PDF generation
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        ├── pages/
        │   └── Home.jsx
        └── components/
            ├── SearchBar.jsx
            ├── OvervaluationGauge.jsx
            ├── CompsTable.jsx
            ├── PriceChart.jsx
            ├── ProjectionChart.jsx
            ├── RedFlagPanel.jsx
            ├── NeighborhoodStats.jsx
            └── ReportButton.jsx
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/property/autocomplete?q=...` | Address suggestions |
| `GET` | `/api/property/detail?address=&zip_code=` | Property detail |
| `GET` | `/api/comps/?zip_code=&bedrooms=&sqft=` | Comparable sales |
| `GET` | `/api/trends/?state=&asking_price=` | FHFA HPI + projections |
| `GET` | `/api/neighborhood/?zip_code=` | Census demographics |
| `POST` | `/api/analyze` | Full analysis (all sources in parallel) |
| `POST` | `/api/report` | Generate PDF download |
| `GET` | `/api/health` | API status + key config check |

---

## Disclaimer

HomeTrue is for **informational purposes only**. It is not financial, legal, or real estate advice. Projections are estimates based on historical FHFA data and do not guarantee future value.
