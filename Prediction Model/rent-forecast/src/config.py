"""Central configuration: paths, temporal split dates, and feature lists.

All feature/target decisions live here so features.py, train.py, evaluate.py
and interpret.py agree on a single source of truth.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "malaysia_rental_panel.csv"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"

MODELS_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)

# --------------------------------------------------------------------------- #
# Panel identifiers
# --------------------------------------------------------------------------- #
ID_COL = "facility_id"
DATE_COL = "record_date"

# The raw current-month rent. Source of the shifted t+2 / t+3 targets and a
# feature for the models.
CURRENT_RENT_COL = "current_rent_rm"
# Provided in the CSV; equals the next row's current_rent_rm (verified). Used
# directly as the h=1 target per the plan.
NEXT_RENT_COL = "next_month_rent_rm"

# --------------------------------------------------------------------------- #
# Direct multi-horizon forecasting
# --------------------------------------------------------------------------- #
HORIZONS = (1, 2, 3)


def target_col(horizon: int) -> str:
    return f"target_h{horizon}"


# --------------------------------------------------------------------------- #
# Temporal split (NEVER random). Split on the feature-row date t.
#   Train:      Jan 2019 - Dec 2023   (fit)
#   Validation: Jan 2024 - Dec 2024   (Ridge alpha tuning, ablations)
#   Test:       Jan 2025 - Dec 2025   (final metrics, touched once)
# --------------------------------------------------------------------------- #
TRAIN_END = pd.Timestamp("2023-12-31")
VAL_START = pd.Timestamp("2024-01-01")
VAL_END = pd.Timestamp("2024-12-31")
TEST_START = pd.Timestamp("2025-01-01")
TEST_END = pd.Timestamp("2025-12-31")

# --------------------------------------------------------------------------- #
# Columns dropped before modelling (plan section 3, plus high-cardinality
# location/identifier columns not present in the plan's feature blocks).
#   Identifiers:            facility_id, apartment_name, record_date
#   High cardinality:       postcode, nearest_station, city, district, developer
#                           (location captured by `state` + distance features)
#   Redundant:              completion_year (~building_age), season (~month),
#                           year (replaced by months_since_start)
#   Raw month:              replaced by month_sin / month_cos
#   Leakage / target:       next_month_rent_rm is the h=1 target, not a feature
# --------------------------------------------------------------------------- #
DROP_COLS = [
    ID_COL,
    "apartment_name",
    DATE_COL,
    "postcode",
    "nearest_station",
    "city",
    "district",
    "developer",
    "completion_year",
    "season",
    "year",
    "month",
    NEXT_RENT_COL,
]

# --------------------------------------------------------------------------- #
# Feature lists (Model A / full feature set)
# --------------------------------------------------------------------------- #
# Engineered time features created in features.py.
ENGINEERED_NUMERIC = ["month_sin", "month_cos", "months_since_start"]

# Price-history lag features (collinear; the three below are dropped in Model B).
LAG_FEATURES = [
    "previous_month_rent",
    "previous_3m_average",
    "previous_6m_average",
]

NUMERIC_FEATURES = [
    # price history
    CURRENT_RENT_COL,
    "previous_month_rent",
    "previous_3m_average",
    "previous_6m_average",
    "rent_growth_last_year",
    # property
    "floor_area_sqft",
    "bedrooms",
    "bathrooms",
    "parking_spaces",
    "building_age",
    "maintenance_fee_rm",
    "total_floors",
    "total_units",
    # location (numeric)
    "distance_to_lrt_km",
    "distance_to_city_center_km",
    "shopping_mall_distance_km",
    "hospital_distance_km",
    "crime_index",
    "school_rating",
    "average_income_area",
    # macro
    "inflation_rate",
    "opr_rate",
    "cpi_index",
    "unemployment_rate",
    "occupancy_rate",
    # time (engineered)
    *ENGINEERED_NUMERIC,
]

CATEGORICAL_FEATURES = [
    "state",
    "property_type",
    "furnished",
    "floor_level",
    "tenure",
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# --------------------------------------------------------------------------- #
# Model B (interpretation): reduced lag set. Keep current_rent_rm and
# rent_growth_last_year, drop the three collinear rolling/lag features.
# --------------------------------------------------------------------------- #
MODEL_B_DROP = list(LAG_FEATURES)
MODEL_B_NUMERIC = [c for c in NUMERIC_FEATURES if c not in MODEL_B_DROP]
MODEL_B_CATEGORICAL = list(CATEGORICAL_FEATURES)

# Ridge alpha grid tuned on the 2024 validation year.
RIDGE_ALPHAS = [0.001, 0.01, 0.1, 1.0, 10.0, 100.0, 1000.0]

RANDOM_STATE = 42
