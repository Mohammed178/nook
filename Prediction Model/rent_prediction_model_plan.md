# Plan: 3-Month Rental Price Prediction Model (Linear Regression)

Dataset: `malaysia_rental_panel.csv` (43,680 rows, 520 facilities, Jan 2019 to Dec 2025).
Goal: given everything known about a facility at month *t*, predict its rent at *t+1*, *t+2*, and *t+3*.

---

## 1. Forecasting strategy: direct multi-horizon

Train **three separate linear regression models**, one per horizon. All three use the same features (known at time *t*); only the target differs.

| Model | Target | How to create it |
|---|---|---|
| M1 | rent at t+1 | `next_month_rent_rm` (already in the dataset) |
| M2 | rent at t+2 | `df.groupby('facility_id')['current_rent_rm'].shift(-2)` |
| M3 | rent at t+3 | `df.groupby('facility_id')['current_rent_rm'].shift(-3)` |

Rows near the end of each facility's history lose their t+2 / t+3 targets after shifting; drop those rows per model.

Why direct instead of recursive (predict t+1, feed it back in to predict t+2): recursive compounds prediction error at each step and requires rebuilding rolling averages from predicted values. Direct keeps each model a plain OLS fit, which is easier to defend in an FYP report and is the standard baseline for multi-horizon forecasting.

## 2. Tech stack

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| Language | Python | 3.11+ | everything |
| Data | pandas | 2.2.x | loading, lag/shift engineering |
| Data | numpy | 1.26+ | numerics |
| Modeling | scikit-learn | 1.5.x | Pipeline, ColumnTransformer, LinearRegression, Ridge, metrics |
| Inference | statsmodels | 0.14.x | OLS with p-values, confidence intervals, VIF |
| Visualisation | matplotlib | 3.9.x | residual plots, forecasts |
| Visualisation | seaborn | 0.13.x | coefficient and error charts |
| Persistence | joblib | 1.4.x | save/load trained pipelines |
| Notebook | jupyterlab | 4.x | EDA and experiments |
| API | FastAPI + uvicorn | 0.115.x / 0.30.x | prediction service |
| Validation | pydantic | 2.x | request/response schemas |
| Demo UI (optional) | streamlit | 1.38.x | interactive dashboard |
| Testing | pytest | 8.x | pipeline and API tests |

`requirements.txt` pins all of the above. One virtualenv, no GPU needed.

## 3. Data preparation

**Load and sort.** Parse `record_date` as datetime, sort by `facility_id` then date. Create the t+2 and t+3 targets as in section 1.

**Temporal split.** Never split randomly; rows from the same facility would land in both train and test and inflate R².

| Split | Period | Use |
|---|---|---|
| Train | Jan 2019 to Dec 2023 | fit |
| Validation | Jan to Dec 2024 | Ridge alpha tuning, feature ablations |
| Test | Jan to Dec 2025 | final metrics, touched once |

**Missing values.** About 1.3% of rows have one NaN in `crime_index`, `school_rating`, `shopping_mall_distance_km`, `hospital_distance_km`, or `occupancy_rate`. Impute with the median, fitted on train only (handled inside the pipeline, section 5).

**Drop columns.** `facility_id`, `apartment_name`, `record_date` (identifiers), `postcode`, `nearest_station` (high cardinality, location already captured by state/district distances), `completion_year` (redundant with `building_age`), `season` (redundant with `month`), `year` (a model trained on years up to 2023 cannot extrapolate a raw year value; replace with `months_since_start`, an integer trend counter).

## 4. Features and expected coefficients

Group the ~30 features into five blocks. Expected signs, which the coefficient analysis must confirm:

| Block | Features | Expected effect on future rent |
|---|---|---|
| Price history | current_rent_rm, previous_month_rent, previous_3m_average, previous_6m_average, rent_growth_last_year | current_rent strongly positive and dominant; 3m/6m averages positive (mean reversion pull) |
| Property | floor_area_sqft (+), bedrooms (+), bathrooms (+), parking_spaces (+), building_age (−), maintenance_fee_rm (+, proxies quality), total_floors, total_units, property_type, furnished, floor_level, tenure | Fully Furnished and Serviced Apartment positive; older buildings negative |
| Location | state dummies, distance_to_lrt_km (−), distance_to_city_center_km (−), shopping_mall_distance_km (−), hospital_distance_km, crime_index (−), school_rating (+), average_income_area (+) | KL positive vs other states |
| Macro | inflation_rate (+), opr_rate, cpi_index (+), unemployment_rate (−), occupancy_rate (+) | small but significant |
| Time | month_sin, month_cos (cyclical encoding of month), months_since_start (+ trend) | captures Jan and Sep/Oct demand peaks |

Encode `month` as sin/cos rather than a raw 1 to 12 integer so December and January sit next to each other.

## 5. Preprocessing pipeline (leakage-proof)

One scikit-learn `Pipeline` per horizon so every transform is fitted on train data only:

```
ColumnTransformer
├── numeric:      SimpleImputer(median) -> StandardScaler
└── categorical:  SimpleImputer(most_frequent) -> OneHotEncoder(drop='first', handle_unknown='ignore')
        ↓
LinearRegression
```

StandardScaler changes nothing about OLS predictions but makes the standardized coefficients directly comparable, which answers "which factor impacts price most" in the report.

## 6. Training and the multicollinearity problem

`current_rent_rm`, `previous_month_rent`, and the rolling averages correlate above 0.95. That is fine for prediction but poisons coefficient interpretation (signs flip, standard errors explode). Handle it with a two-model design per horizon:

**Model A (accuracy).** Full feature set, sklearn `LinearRegression`. This is the headline predictor. Also fit `Ridge` with alpha tuned on the 2024 validation year; if Ridge matches OLS accuracy with stabler coefficients, report both.

**Model B (interpretation).** statsmodels `OLS` on a reduced set: keep `current_rent_rm`, drop the other three lag features, keep everything else. Report coefficients, p-values, 95% confidence intervals, and VIF (target VIF < 10 for every retained feature). This table is the "coefficients that impact price" deliverable.

## 7. Evaluation

Per horizon on the untouched 2025 test year: R², RMSE, MAE, MAPE. Two baselines every model must beat:

1. Naive: rent(t+h) = rent(t)
2. Drift: rent(t+h) = rent(t) × (1 + recent monthly growth)

Expected outcome given how the data was generated: R² ≈ 0.94 at h=1, degrading toward roughly 0.88 to 0.91 at h=3 as the AR noise accumulates. The dataset has an irreducible noise floor by design, so do not chase R² above ~0.95; that would indicate leakage, not skill.

Diagnostics for the report: residuals vs fitted, Q-Q plot, error broken down by state and by price band (MAPE misbehaves on cheap units, so show MAE alongside), and 3 to 5 example facilities plotted with actual vs predicted rent over 2025.

## 8. Serving layer

Save the three fitted pipelines with joblib (`model_h1.joblib`, etc.). Wrap them in a FastAPI service:

- `POST /predict` accepts one facility's current-month feature row (pydantic schema mirrors the CSV columns) and returns `{"h1": ..., "h2": ..., "h3": ...}` in RM.
- `POST /predict/batch` accepts a CSV upload and returns predictions for every row.
- `GET /model/info` returns metrics and top coefficients for transparency.

Any frontend (Laravel, React, or a Streamlit demo page) calls this over HTTP. For the FYP demo, a small Streamlit app with a facility dropdown, a rent history chart, and the 3-month forecast overlaid is the fastest path.

## 9. Project structure

```
rent-forecast/
├── data/
│   └── malaysia_rental_panel.csv
├── notebooks/
│   ├── 01_eda.ipynb
│   └── 02_experiments.ipynb
├── src/
│   ├── config.py           # paths, split dates, feature lists
│   ├── features.py         # target shifts, month sin/cos, drops
│   ├── pipeline.py         # ColumnTransformer + model builders
│   ├── train.py            # fits M1..M3, saves joblib + metrics.json
│   ├── evaluate.py         # test metrics, baselines, plots
│   └── interpret.py        # statsmodels OLS, VIF, coefficient table
├── models/                 # *.joblib artifacts
├── api/
│   ├── main.py             # FastAPI app
│   └── schemas.py
├── app/                    # optional streamlit demo
├── tests/
├── requirements.txt
└── README.md
```

## 10. Build order

| Phase | Work | Output |
|---|---|---|
| 1 | EDA notebook: distributions, correlations, rent trends by district, COVID dip visual | charts for report chapter |
| 2 | `features.py` + `config.py`: targets, encodings, temporal split | reproducible dataset builder |
| 3 | `pipeline.py` + `train.py`: fit M1 to M3, OLS and Ridge | 3 saved pipelines |
| 4 | `evaluate.py`: metrics vs baselines on 2025, diagnostics | results tables and plots |
| 5 | `interpret.py`: reduced OLS, VIF, coefficient table with signs and p-values | coefficient chapter |
| 6 | FastAPI service + tests | working `/predict` endpoint |
| 7 | Streamlit demo, README, final report writing | demo + documentation |

Phases 1 to 5 are the core; 6 and 7 make it presentable.

## 11. Pitfalls to avoid

1. Random train/test split. Same facility appears in both sides; R² jumps to ~0.99 and the result is invalid.
2. Fitting the imputer or scaler on the full dataset before splitting. Keep every transform inside the Pipeline.
3. Interpreting Model A's coefficients directly. Collinear lags make them unstable; use Model B.
4. Using raw `year` as a feature. The model memorises 2019 to 2023 levels and extrapolates badly into 2025+.
5. Quoting MAPE alone. RM 100 error on an RM 800 Seremban unit is 12.5% but the same error on KLCC is 1%; always pair with MAE/RMSE.
