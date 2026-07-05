"""FastAPI serving layer for the 3-month rental price prediction model.

Loads the three fitted sklearn pipelines (one per horizon) once at startup and
exposes four endpoints:

  POST /predict         one facility-month row  -> {h1, h2, h3} rent in RM
  POST /predict/batch   CSV upload (panel cols) -> per-row forecasts
  GET  /model/info      test metrics + top coefficients per horizon
  GET  /predict/areas   every area's 3-month forecast (?level=state|district)

Feature engineering is delegated to `src.features` / `src.config` so the model's
feature contract is never duplicated. The only piece computed here is the
`months_since_start` trend counter, which must be anchored to the *global* panel
start (Jan 2019); a lone request row has no global context, so we re-anchor it
explicitly after reusing `add_time_features` for the cyclical month encoding.
"""
from __future__ import annotations

import io
import json
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from src import config, features
from api.schemas import (
    AreaForecast,
    AreasResponse,
    BatchPredictionRow,
    BatchPredictResponse,
    Coefficient,
    FacilityFeatures,
    HorizonMetrics,
    ModelInfoResponse,
    PredictResponse,
)

# The global panel start. months_since_start is measured from here (see plan).
PANEL_START = pd.Timestamp("2019-01-01")
TOP_N_COEFS = 10

# Populated at startup by the lifespan handler.
STATE: dict = {"models": {}, "areas_cache": {}}


# --------------------------------------------------------------------------- #
# Feature engineering (reuses src.features; re-anchors the trend counter)
# --------------------------------------------------------------------------- #
def engineer(df: pd.DataFrame) -> pd.DataFrame:
    """Add the three engineered time columns to a raw feature frame.

    `record_date` must be present. `month` is derived from it when absent.
    month_sin/month_cos come straight from `src.features.add_time_features`;
    months_since_start is re-anchored to the fixed global panel start so it is
    correct for a single request row (add_time_features anchors to the local min,
    which is only correct when the frame already spans from Jan 2019).
    """
    df = df.copy()
    df[config.DATE_COL] = pd.to_datetime(df[config.DATE_COL])
    if "month" not in df.columns or df["month"].isna().any():
        df["month"] = df[config.DATE_COL].dt.month
    df = features.add_time_features(df)
    dates = df[config.DATE_COL]
    df["months_since_start"] = (
        (dates.dt.year - PANEL_START.year) * 12 + (dates.dt.month - PANEL_START.month)
    ).astype(int)
    return df


def predict_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer features and return a DataFrame with h1/h2/h3 predictions (RM)."""
    eng = engineer(df)
    X = eng[config.ALL_FEATURES]
    out = pd.DataFrame(index=df.index)
    for h in config.HORIZONS:
        out[f"h{h}"] = STATE["models"][h].predict(X)
    return out


# --------------------------------------------------------------------------- #
# Areas aggregation (cached in memory; the panel is static)
# --------------------------------------------------------------------------- #
def _compute_areas(level: str) -> AreasResponse:
    cache = STATE["areas_cache"]
    if level in cache:
        return cache[level]

    # Load the panel and take each facility's latest month (Dec 2025).
    raw = features.load_raw()
    latest = (
        raw.sort_values(config.DATE_COL)
        .groupby(config.ID_COL, sort=False)
        .tail(1)
        .reset_index(drop=True)
    )
    as_of = latest[config.DATE_COL].max()

    preds = predict_frame(latest)
    panel = latest[[config.ID_COL, "state", "district", config.CURRENT_RENT_COL]].copy()
    panel = pd.concat([panel, preds], axis=1)

    group_col = "state" if level == "state" else "district"
    grouped = panel.groupby(group_col)
    areas: list[AreaForecast] = []
    for name, g in grouped:
        median_current = float(g[config.CURRENT_RENT_COL].median())
        median_h3 = float(g["h3"].median())
        pct = (
            (median_h3 - median_current) / median_current * 100.0
            if median_current
            else 0.0
        )
        areas.append(
            AreaForecast(
                area=str(name),
                level=level,
                facility_count=int(len(g)),
                median_current_rent=round(median_current, 2),
                median_pred_h1=round(float(g["h1"].median()), 2),
                median_pred_h2=round(float(g["h2"].median()), 2),
                median_pred_h3=round(median_h3, 2),
                pct_change_h3=round(pct, 2),
            )
        )
    areas.sort(key=lambda a: a.area)

    resp = AreasResponse(
        level=level,
        as_of=as_of.date().isoformat(),
        n_areas=len(areas),
        areas=areas,
    )
    cache[level] = resp
    return resp


# --------------------------------------------------------------------------- #
# model/info assembly (test metrics + top coefficients)
# --------------------------------------------------------------------------- #
def _load_model_info() -> ModelInfoResponse:
    with open(config.REPORTS_DIR / "test_metrics.json", encoding="utf-8") as fh:
        metrics = json.load(fh)["horizons"]

    horizons: dict[str, HorizonMetrics] = {}
    for h in config.HORIZONS:
        key = f"h{h}"
        m = metrics[key]
        ols = m["ols"]

        coef_path = config.REPORTS_DIR / f"coefficients_h{h}.csv"
        top_coefs: list[Coefficient] = []
        if coef_path.exists():
            cdf = pd.read_csv(coef_path)
            cdf = cdf[cdf["feature"] != "const"].copy()
            cdf["abs_coef"] = cdf["coef"].abs()
            cdf = cdf.sort_values("abs_coef", ascending=False).head(TOP_N_COEFS)
            top_coefs = [
                Coefficient(feature=str(r.feature), coef=round(float(r.coef), 4))
                for r in cdf.itertuples()
            ]

        horizons[key] = HorizonMetrics(
            n_test=int(m["n_test"]),
            r2=round(ols["r2"], 4),
            rmse=round(ols["rmse"], 2),
            mae=round(ols["mae"], 2),
            mape=round(ols["mape"], 2),
            beats_naive=bool(m["beats_naive"]),
            beats_drift=bool(m["beats_drift"]),
            top_coefficients=top_coefs,
        )

    return ModelInfoResponse(
        trained_through="Dec 2023 (fit); tuned on 2024",
        tested_on="Jan-Dec 2025 (untouched test year)",
        horizons=horizons,
    )


# --------------------------------------------------------------------------- #
# App
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(app: FastAPI):
    for h in config.HORIZONS:
        path = config.MODELS_DIR / f"model_h{h}.joblib"
        STATE["models"][h] = joblib.load(path)
    yield
    STATE["models"].clear()
    STATE["areas_cache"].clear()


app = FastAPI(
    title="Malaysia Rent Forecast API",
    description="3-month rental price forecasts (t+1, t+2, t+3) in RM.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
def root():
    return {
        "service": "Malaysia Rent Forecast API",
        "endpoints": ["/predict", "/predict/batch", "/model/info", "/predict/areas"],
        "docs": "/docs",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(features_in: FacilityFeatures) -> PredictResponse:
    """Forecast one facility's rent for the next three months."""
    row = pd.DataFrame([features_in.model_dump()])
    preds = predict_frame(row).iloc[0]
    return PredictResponse(
        h1=round(float(preds["h1"]), 2),
        h2=round(float(preds["h2"]), 2),
        h3=round(float(preds["h3"]), 2),
    )


@app.post("/predict/batch")
async def predict_batch(
    file: UploadFile = File(..., description="CSV with the panel feature columns."),
    fmt: str = Query("json", pattern="^(json|csv)$", description="Response format."),
):
    """Forecast every row of an uploaded CSV (same columns as the panel CSV)."""
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:  # pragma: no cover - pandas raises many subclasses
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV has no rows.")
    if config.DATE_COL not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"CSV must include a '{config.DATE_COL}' column.",
        )

    missing = [c for c in config.ALL_FEATURES if c not in df.columns and c
               not in config.ENGINEERED_NUMERIC]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing required feature columns: {missing}",
        )

    preds = predict_frame(df).round(2)

    if fmt == "csv":
        out = df.copy()
        for h in config.HORIZONS:
            out[f"pred_h{h}"] = preds[f"h{h}"].values
        buf = io.StringIO()
        out.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=predictions.csv"},
        )

    rows = [
        BatchPredictionRow(
            row=i,
            h1=float(preds.iloc[i]["h1"]),
            h2=float(preds.iloc[i]["h2"]),
            h3=float(preds.iloc[i]["h3"]),
        )
        for i in range(len(preds))
    ]
    return BatchPredictResponse(n_rows=len(rows), predictions=rows)


@app.get("/model/info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    """Per-horizon test metrics and the top-10 coefficients by magnitude."""
    return _load_model_info()


@app.get("/predict/areas", response_model=AreasResponse)
def predict_areas(
    level: str = Query("state", pattern="^(state|district)$"),
) -> AreasResponse:
    """Every area's 3-month rent forecast, aggregated by state or district.

    For each facility we predict from its latest observed month (Dec 2025), then
    aggregate the median current and predicted rents per area. Result is cached
    in memory on first call (the panel is static).
    """
    return _compute_areas(level)
