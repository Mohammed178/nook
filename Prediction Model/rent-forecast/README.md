# Malaysia Rent Forecast

Given everything known about a rental facility at month *t*, predict its monthly
rent (in RM) at **t+1, t+2, and t+3**. Three separate linear-regression pipelines
(one per horizon, *direct* multi-horizon forecasting) are trained on a Malaysian
rental panel and served over HTTP with FastAPI.

The headline use case: **every area gets a rolling 3-month price forecast**. The
`/predict/areas` endpoint predicts each facility's next three months from its
latest observed month and aggregates the medians by state or district.

---

## Data

`data/malaysia_rental_panel.csv` — a monthly panel of 520 facilities across 10
states / 28 districts, Jan 2019 to Dec 2025 (43,680 rows). One target and its
lag/rolling features are pre-computed; the rest are property, location, and macro
attributes. See `src/config.py` for the full column contract.

## Modelling approach

- **Direct multi-horizon**: three models, same features, different targets
  (`target_h1 = next_month_rent_rm`, `target_h2/h3` = per-facility forward shifts
  of `current_rent_rm`). Direct avoids the error compounding of recursive
  forecasting.
- **Temporal split** (never random): train Jan 2019–Dec 2023, validate 2024,
  test 2025 (touched once).
- **Leakage-proof pipeline**: `ColumnTransformer` (median-impute + `StandardScaler`
  for numerics; most-frequent-impute + `OneHotEncoder(drop='first',
  handle_unknown='ignore')` for categoricals) → `LinearRegression`. Every
  transform is fitted on the training fold only.
- **Engineered time features**: `month_sin`, `month_cos` (cyclical month) and
  `months_since_start` (integer trend counter measured from Jan 2019, so the model
  extrapolates past 2023 rather than memorising raw years).

## Project structure

```
rent-forecast/
├── data/malaysia_rental_panel.csv
├── src/
│   ├── config.py       # paths, split dates, feature lists (single source of truth)
│   ├── features.py     # targets, month sin/cos, months_since_start, temporal split
│   ├── pipeline.py     # ColumnTransformer + OLS/Ridge builders
│   ├── train.py        # fits M1..M3 → models/*.joblib + metrics.json
│   ├── evaluate.py     # 2025 test metrics vs naive/drift baselines + plots
│   └── interpret.py    # statsmodels OLS, VIF, coefficient tables
├── models/             # model_h1/h2/h3.joblib, ridge_h*.joblib, metrics.json
├── reports/            # test_metrics.json, coefficients_h*.csv, diagnostic PNGs
├── api/
│   ├── main.py         # FastAPI app (4 endpoints, models loaded at startup)
│   └── schemas.py      # pydantic v2 request/response models
├── tests/              # test_features.py, test_pipeline.py, test_api.py
├── requirements.txt
└── README.md
```

## Install

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # Unix
```

## Train / evaluate / interpret

```bash
.venv/Scripts/python -m src.train       # fit 3 pipelines → models/ + metrics.json
.venv/Scripts/python -m src.evaluate    # 2025 test metrics + diagnostic plots → reports/
.venv/Scripts/python -m src.interpret   # statsmodels coefficients + VIF → reports/
```

The trained artifacts are already checked in under `models/` and `reports/`, so the
API runs without retraining.

## Test

```bash
.venv/Scripts/python -m pytest -q
```

21 tests: dataset/leakage (`test_features.py`), preprocessing (`test_pipeline.py`),
and the API (`test_api.py`).

## Serve

```bash
.venv/Scripts/python -m uvicorn api.main:app --reload --port 8000
```

Interactive docs at <http://127.0.0.1:8000/docs>. The three pipelines are loaded
once in a lifespan handler, not per request.

---

## Endpoints

### `POST /predict`

One facility's current-month row → next-three-month forecast in RM. The request
mirrors the raw CSV feature columns; the engineered time features are derived
server-side from `record_date`, so callers never reproduce the encoding.

```bash
curl -s -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "record_date": "2025-12-01",
    "current_rent_rm": 5260, "previous_month_rent": 6010,
    "previous_3m_average": 6360, "previous_6m_average": 5808.33,
    "rent_growth_last_year": -0.75,
    "floor_area_sqft": 959, "bedrooms": 3, "bathrooms": 2, "parking_spaces": 1,
    "building_age": 17, "maintenance_fee_rm": 403.06, "total_floors": 28,
    "total_units": 1113, "distance_to_lrt_km": 1.26,
    "distance_to_city_center_km": 2.7, "shopping_mall_distance_km": 5.56,
    "hospital_distance_km": 2.72, "crime_index": 35.8, "school_rating": 6.5,
    "average_income_area": 12000, "inflation_rate": 0.91, "opr_rate": 3.25,
    "cpi_index": 121.1, "unemployment_rate": 3.16, "occupancy_rate": 90.2,
    "state": "Kuala Lumpur", "property_type": "Condominium",
    "furnished": "Unfurnished", "floor_level": "Mid", "tenure": "Freehold"
  }'
```

```json
{ "h1": 5274.89, "h2": 4863.83, "h3": 4721.38 }
```

A missing feature field returns HTTP 422.

### `POST /predict/batch`

Upload a CSV with the same columns as the panel CSV; get a forecast per row.
`?fmt=json` (default) returns a JSON list; `?fmt=csv` streams the input back with
`pred_h1/pred_h2/pred_h3` columns appended.

```bash
curl -s -X POST "http://127.0.0.1:8000/predict/batch" -F "file=@rows.csv"
curl -s -X POST "http://127.0.0.1:8000/predict/batch?fmt=csv" -F "file=@rows.csv" -o predictions.csv
```

```json
{
  "n_rows": 2,
  "predictions": [
    { "row": 0, "h1": 5274.89, "h2": 4863.83, "h3": 4721.38 },
    { "row": 1, "h1": 4990.12, "h2": 4880.44, "h3": 4802.10 }
  ]
}
```

### `GET /model/info`

Per-horizon 2025 test metrics plus the top-10 coefficients (by magnitude) from the
interpretable OLS.

```bash
curl -s http://127.0.0.1:8000/model/info
```

```json
{
  "model_type": "LinearRegression (OLS) pipeline per horizon",
  "trained_through": "Dec 2023 (fit); tuned on 2024",
  "tested_on": "Jan-Dec 2025 (untouched test year)",
  "horizons": {
    "h1": {
      "n_test": 2433, "r2": 0.9403, "rmse": 591.21, "mae": 372.22,
      "mape": 13.74, "beats_naive": true, "beats_drift": true,
      "top_coefficients": [
        { "feature": "num__current_rent_rm", "coef": 1760.83 },
        { "feature": "num__average_income_area", "coef": 362.29 }
      ]
    }
  }
}
```

### `GET /predict/areas`  — the product endpoint

Predicts each facility's next three months from its latest observed month
(Dec 2025), then aggregates by area. `?level=state` (default) or `?level=district`.
Per area it returns the facility count, median current rent, median predicted rent
for each of h1/h2/h3, and the expected % change to h3. The result is computed once
and cached in memory (the panel is static).

```bash
curl -s "http://127.0.0.1:8000/predict/areas?level=state"
```

```json
{
  "level": "state", "as_of": "2025-12-01", "n_areas": 10,
  "areas": [
    {
      "area": "Kuala Lumpur", "level": "state", "facility_count": 54,
      "median_current_rent": 3300.0, "median_pred_h1": 3218.25,
      "median_pred_h2": 3294.87, "median_pred_h3": 3336.8, "pct_change_h3": 1.12
    },
    {
      "area": "Johor", "level": "state", "facility_count": 18,
      "median_current_rent": 1860.0, "median_pred_h1": 1885.89,
      "median_pred_h2": 1946.33, "median_pred_h3": 1997.02, "pct_change_h3": 7.37
    }
  ]
}
```

---

## Metrics summary (2025 test year, OLS)

| Horizon | n_test | R²    | RMSE (RM) | MAE (RM) | MAPE  | Beats naive | Beats drift |
|---------|--------|-------|-----------|----------|-------|-------------|-------------|
| t+1     | 2433   | 0.940 | 591.21    | 372.22   | 13.7% | yes         | yes         |
| t+2     | 2027   | 0.924 | 665.90    | 435.49   | 16.7% | yes         | yes         |
| t+3     | 1824   | 0.923 | 666.72    | 454.94   | 17.7% | yes         | yes         |

Accuracy degrades with horizon as forecast noise accumulates, as expected. MAPE is
reported alongside MAE/RMSE because MAPE overstates error on cheap units. Ridge
variants (tuned on 2024) match OLS to ~3 decimals; OLS is the headline predictor.

## Caveat on the test period

The models are **fit on data through Dec 2023** (and alpha-tuned on 2024). The
metrics above are on the **untouched 2025 test year** — genuine out-of-sample
performance, not in-sample fit. The served predictions from `/predict/areas`
forecast **2026 Q1** from the Dec 2025 rows, i.e. beyond every observation used in
training. Treat forecasts as directional guidance, not precise quotes, and retrain
as newer months arrive.
