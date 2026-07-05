"""API tests: happy paths for all four endpoints, a 422 validation error, a
batch CSV round-trip, and sanity checks on the areas aggregation.

Uses FastAPI's TestClient (httpx under the hood). The lifespan handler loads the
three joblib pipelines, so `with TestClient(app)` exercises real models.
"""
from __future__ import annotations

import io

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from api.main import app
from src import config, features

# A complete, valid request body (a real KL facility-month).
VALID_PAYLOAD = {
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

# Plausible RM range for monthly rent in this dataset (guards against unit bugs).
RENT_LO, RENT_HI = 100.0, 100_000.0


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_predict_happy_path(client):
    resp = client.post("/predict", json=VALID_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"h1", "h2", "h3"}
    for h in ("h1", "h2", "h3"):
        assert RENT_LO < body[h] < RENT_HI, f"{h}={body[h]} out of range"


def test_predict_missing_field_returns_422(client):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "current_rent_rm"}
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 422


def test_predict_batch_json(client):
    # Build a tiny in-test CSV from two real panel rows.
    raw = features.load_raw().head(2)
    buf = io.StringIO()
    raw.to_csv(buf, index=False)
    files = {"file": ("panel.csv", buf.getvalue(), "text/csv")}
    resp = client.post("/predict/batch", files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["n_rows"] == 2
    assert len(body["predictions"]) == 2
    first = body["predictions"][0]
    assert set(first) >= {"row", "h1", "h2", "h3"}
    for h in ("h1", "h2", "h3"):
        assert RENT_LO < first[h] < RENT_HI


def test_predict_batch_csv_download(client):
    raw = features.load_raw().head(3)
    buf = io.StringIO()
    raw.to_csv(buf, index=False)
    files = {"file": ("panel.csv", buf.getvalue(), "text/csv")}
    resp = client.post("/predict/batch?fmt=csv", files=files)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    out = pd.read_csv(io.StringIO(resp.text))
    assert len(out) == 3
    for h in config.HORIZONS:
        assert f"pred_h{h}" in out.columns


def test_model_info(client):
    resp = client.get("/model/info")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body["horizons"]) == {"h1", "h2", "h3"}
    h1 = body["horizons"]["h1"]
    assert 0.5 < h1["r2"] <= 1.0
    assert h1["rmse"] > 0
    assert h1["beats_naive"] is True
    # Top coefficients present and capped at 10.
    assert 0 < len(h1["top_coefficients"]) <= 10
    assert "feature" in h1["top_coefficients"][0]


def test_areas_state_level(client):
    resp = client.get("/predict/areas?level=state")
    assert resp.status_code == 200
    body = resp.json()
    assert body["level"] == "state"
    assert body["n_areas"] == len(body["areas"]) > 0
    total_facilities = sum(a["facility_count"] for a in body["areas"])
    assert total_facilities > 0
    for a in body["areas"]:
        assert RENT_LO < a["median_current_rent"] < RENT_HI
        for k in ("median_pred_h1", "median_pred_h2", "median_pred_h3"):
            assert RENT_LO < a[k] < RENT_HI
        assert "pct_change_h3" in a


def test_areas_district_level_and_default(client):
    district = client.get("/predict/areas?level=district").json()
    state = client.get("/predict/areas").json()  # default level
    assert district["level"] == "district"
    assert state["level"] == "state"
    # There are more districts than states in Malaysia's panel.
    assert district["n_areas"] > state["n_areas"]


def test_areas_bad_level_rejected(client):
    resp = client.get("/predict/areas?level=galaxy")
    assert resp.status_code == 422
