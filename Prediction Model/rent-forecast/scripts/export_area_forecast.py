"""Export a per-area 3-month rent-forecast snapshot for the Nook website.

The panel is static (latest month = Dec 2025) so the forecast is deterministic;
we run the model once here and commit the result as JSON rather than serving the
FastAPI at runtime.

IMPORTANT — what is (and isn't) written
---------------------------------------
The panel is a *synthetic* nationwide dataset. Its absolute rents are on a
different scale than Nook's real student-room listings (model "current" Bangsar
~= RM6,945 vs real Nook Bangsar rooms ~= RM800). So this script writes ONLY the
**percentage change** per horizon; the website rebases those percentages onto
Nook's own median listing price per area. No synthetic RM value is exported.

Area -> panel mapping
---------------------
Nook areas are Klang Valley neighbourhoods; the panel keys on state/city/
district. AREA_MAP below is the curated crosswalk (verified against the panel's
Dec-2025 facility counts). Areas with no reasonable panel proxy
(bangi / serdang / gombak) are omitted entirely -> the site renders no outlook
for them (honest, no fabrication).

Feature engineering reuses `src.features` / `src.config` (the single source of
truth for the feature contract) and re-anchors `months_since_start` to the fixed
global panel start, exactly as the API does for a lone request row.

Regenerate (paths contain spaces -> quote):
    cd "Prediction Model/rent-forecast"
    .venv/Scripts/python scripts/export_area_forecast.py
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

# Make `src` importable when run as `python scripts/export_area_forecast.py`.
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from src import config, features  # noqa: E402

# Fixed global panel start; months_since_start is measured from here (see plan).
PANEL_START = pd.Timestamp("2019-01-01")

# Where the website reads the snapshot from (repo lib/seed/).
# BASE_DIR = .../nook/Prediction Model/rent-forecast  ->  parents[2] = .../nook
OUT_PATH = BASE_DIR.parents[1] / "lib" / "seed" / "rent-forecast.json"

MODEL_VERSION = "1.0.0"

# Curated Nook-area -> panel crosswalk.
#   level "district": match rows where panel `district` is in `names`.
#   level "city":     match rows where panel `city` is in `names`.
# Omitted Nook areas (bangi, serdang, gombak) have no panel proxy on purpose.
AREA_MAP: dict[str, dict] = {
    "bangsar": {"level": "district", "names": ["Bangsar"]},
    "cheras": {"level": "district", "names": ["Cheras"]},
    "setapak": {"level": "district", "names": ["Setapak"]},
    "subang-jaya": {"level": "district", "names": ["SS15"]},
    "shah-alam": {"level": "district", "names": ["Seksyen 7"]},
    "pj": {"level": "city", "names": ["Petaling Jaya"]},
    "cyberjaya": {"level": "city", "names": ["Cyberjaya"]},
    "bandar-sunway": {"level": "city", "names": ["Subang Jaya"]},
    # pantai-dalam has no panel district of its own; the adjacent Bangsar panel
    # (both sit beside UM) is the closest honest proxy. Loosest call in the map.
    "pantai-dalam": {"level": "district", "names": ["Bangsar"]},
}


def load_models() -> dict[int, object]:
    return {
        h: joblib.load(config.MODELS_DIR / f"model_h{h}.joblib")
        for h in config.HORIZONS
    }


def engineer(df: pd.DataFrame) -> pd.DataFrame:
    """Add the engineered time columns, re-anchoring the trend counter to the
    fixed global panel start (mirrors api/main.py:engineer)."""
    df = df.copy()
    df[config.DATE_COL] = pd.to_datetime(df[config.DATE_COL])
    if "month" not in df.columns or df["month"].isna().any():
        df["month"] = df[config.DATE_COL].dt.month
    df = features.add_time_features(df)
    dates = df[config.DATE_COL]
    df["months_since_start"] = (
        (dates.dt.year - PANEL_START.year) * 12
        + (dates.dt.month - PANEL_START.month)
    ).astype(int)
    return df


def latest_month_panel() -> tuple[pd.DataFrame, pd.Timestamp]:
    """Each facility's most recent observation (Dec 2025), with h1/h2/h3 preds."""
    raw = features.load_raw()
    latest = (
        raw.sort_values(config.DATE_COL)
        .groupby(config.ID_COL, sort=False)
        .tail(1)
        .reset_index(drop=True)
    )
    as_of = latest[config.DATE_COL].max()

    eng = engineer(latest)
    X = eng[config.ALL_FEATURES]
    models = load_models()
    for h in config.HORIZONS:
        latest[f"h{h}"] = models[h].predict(X)
    return latest, as_of


def _median_pct(group: pd.DataFrame, horizon: int) -> float:
    """Median per-facility % change for a horizon.

    Per-facility-then-median (each facility's own trajectory) is scale-robust and
    differs slightly from the API's median-of-levels; we want a stable percentage
    to rebase onto Nook's real median, so per-facility is the right unit here.
    """
    cur = group[config.CURRENT_RENT_COL]
    pred = group[f"h{horizon}"]
    pct = (pred - cur) / cur * 100.0
    return round(float(pct.median()), 2)


def build_snapshot() -> dict:
    latest, as_of = latest_month_panel()
    areas: dict[str, dict] = {}

    for slug, spec in AREA_MAP.items():
        col = "district" if spec["level"] == "district" else "city"
        g = latest[latest[col].isin(spec["names"])]
        if g.empty:
            print(f"  WARNING: no panel rows for {slug} ({spec}); skipping")
            continue
        areas[slug] = {
            "match": ", ".join(spec["names"]),
            "level": spec["level"],
            "n": int(len(g)),
            "pctH1": _median_pct(g, 1),
            "pctH2": _median_pct(g, 2),
            "pctH3": _median_pct(g, 3),
        }

    # Test R^2 per horizon, read straight from the model's own metrics report.
    with open(config.REPORTS_DIR / "test_metrics.json", encoding="utf-8") as fh:
        metrics = json.load(fh)["horizons"]
    test_r2 = {
        f"h{h}": round(metrics[f"h{h}"]["ols"]["r2"], 3) for h in config.HORIZONS
    }

    return {
        "generatedAt": dt.date.today().isoformat(),
        "modelVersion": MODEL_VERSION,
        "asOf": as_of.strftime("%Y-%m"),
        "testR2": test_r2,
        "areas": areas,
    }


def main() -> None:
    snapshot = build_snapshot()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    n = len(snapshot["areas"])
    print(f"Wrote {n} area forecasts (as of {snapshot['asOf']}) -> {OUT_PATH}")
    for slug, a in snapshot["areas"].items():
        print(f"  {slug:14} {a['match']:16} n={a['n']:3} h3={a['pctH3']:+.1f}%")


if __name__ == "__main__":
    main()
