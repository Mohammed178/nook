"""Pydantic v2 request/response models for the rent-forecast API.

The request mirrors the *raw* feature columns a caller knows for one
facility-month. It deliberately does NOT include the three engineered columns
(`month_sin`, `month_cos`, `months_since_start`) -- those are derived server-side
from `record_date` by `src.features.add_time_features` so the caller never has to
reproduce the trend/cyclical encoding. All monetary values are Malaysian Ringgit
(RM).
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FacilityFeatures(BaseModel):
    """One facility's current-month (time *t*) feature row.

    Every field here is a raw column from the panel CSV that a caller would
    plausibly know at prediction time. The API engineers the time features and
    feeds the row to the three fitted pipelines.
    """

    # --- when ------------------------------------------------------------- #
    record_date: date = Field(
        ..., description="Feature-row date t (YYYY-MM-DD). Drives the time trend."
    )

    # --- price history ---------------------------------------------------- #
    current_rent_rm: float = Field(..., description="Rent this month (RM).")
    previous_month_rent: float = Field(..., description="Rent last month (RM).")
    previous_3m_average: float = Field(..., description="Trailing 3-month avg rent (RM).")
    previous_6m_average: float = Field(..., description="Trailing 6-month avg rent (RM).")
    rent_growth_last_year: float = Field(..., description="YoY rent growth (%).")

    # --- property --------------------------------------------------------- #
    floor_area_sqft: float
    bedrooms: int
    bathrooms: int
    parking_spaces: int
    building_age: int
    maintenance_fee_rm: float
    total_floors: int
    total_units: int

    # --- location (numeric) ---------------------------------------------- #
    distance_to_lrt_km: float
    distance_to_city_center_km: float
    shopping_mall_distance_km: float
    hospital_distance_km: float
    crime_index: float
    school_rating: float
    average_income_area: float

    # --- macro ------------------------------------------------------------ #
    inflation_rate: float
    opr_rate: float
    cpi_index: float
    unemployment_rate: float
    occupancy_rate: float

    # --- categorical ------------------------------------------------------ #
    state: str
    property_type: str
    furnished: str
    floor_level: str
    tenure: str

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "record_date": "2025-12-01",
                "current_rent_rm": 5260.0,
                "previous_month_rent": 6010.0,
                "previous_3m_average": 6360.0,
                "previous_6m_average": 5808.33,
                "rent_growth_last_year": -0.75,
                "floor_area_sqft": 959,
                "bedrooms": 3,
                "bathrooms": 2,
                "parking_spaces": 1,
                "building_age": 17,
                "maintenance_fee_rm": 403.06,
                "total_floors": 28,
                "total_units": 1113,
                "distance_to_lrt_km": 1.26,
                "distance_to_city_center_km": 2.7,
                "shopping_mall_distance_km": 5.56,
                "hospital_distance_km": 2.72,
                "crime_index": 35.8,
                "school_rating": 6.5,
                "average_income_area": 12000,
                "inflation_rate": 0.91,
                "opr_rate": 3.25,
                "cpi_index": 121.1,
                "unemployment_rate": 3.16,
                "occupancy_rate": 90.2,
                "state": "Kuala Lumpur",
                "property_type": "Condominium",
                "furnished": "Unfurnished",
                "floor_level": "Mid",
                "tenure": "Freehold",
            }
        },
    )


class PredictResponse(BaseModel):
    """Three-horizon rent forecast for a single facility, in RM."""

    h1: float = Field(..., description="Predicted rent at t+1 (RM).")
    h2: float = Field(..., description="Predicted rent at t+2 (RM).")
    h3: float = Field(..., description="Predicted rent at t+3 (RM).")


class BatchPredictionRow(PredictResponse):
    """A single row of the batch response: the row index plus its forecast."""

    row: int = Field(..., description="Zero-based row index in the uploaded CSV.")


class BatchPredictResponse(BaseModel):
    n_rows: int
    predictions: list[BatchPredictionRow]


class HorizonMetrics(BaseModel):
    """Test-year (2025) metrics for one horizon, plus its top coefficients."""

    n_test: int
    r2: float
    rmse: float
    mae: float
    mape: float
    beats_naive: bool
    beats_drift: bool
    top_coefficients: list["Coefficient"]


class Coefficient(BaseModel):
    feature: str
    coef: float


class ModelInfoResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_type: str = "LinearRegression (OLS) pipeline per horizon"
    trained_through: str
    tested_on: str
    horizons: dict[str, HorizonMetrics]


class AreaForecast(BaseModel):
    """Aggregated 3-month forecast for one area (a state or a district)."""

    area: str
    level: Literal["state", "district"]
    facility_count: int
    median_current_rent: float
    median_pred_h1: float
    median_pred_h2: float
    median_pred_h3: float
    pct_change_h3: float = Field(
        ..., description="Expected % change from current to t+3 median rent."
    )


class AreasResponse(BaseModel):
    level: Literal["state", "district"]
    as_of: str = Field(..., description="The latest month predicted from (YYYY-MM-DD).")
    n_areas: int
    areas: list[AreaForecast]


# Resolve forward reference (HorizonMetrics -> Coefficient).
HorizonMetrics.model_rebuild()
