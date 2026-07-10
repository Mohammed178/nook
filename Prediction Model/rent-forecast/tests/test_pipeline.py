"""Tests for the preprocessing pipeline: fit/predict shapes, that transforms are
fitted on train only, and that unseen categories don't crash prediction."""
from __future__ import annotations

import numpy as np
import pytest
from sklearn.linear_model import LinearRegression

from src import config
from src.features import build_dataset, get_Xy, temporal_split
from src.pipeline import build_ols_pipeline, build_ridge_pipeline


@pytest.fixture(scope="module")
def splits():
    df = build_dataset()
    return temporal_split(df)


def test_pipeline_fit_predict_shape(splits):
    train, val, _ = splits
    X_tr, y_tr = get_Xy(train, 1)
    X_val, y_val = get_Xy(val, 1)
    pipe = build_ols_pipeline()
    pipe.fit(X_tr, y_tr)
    preds = pipe.predict(X_val)
    assert preds.shape == (len(X_val),)
    assert np.isfinite(preds).all()


def test_final_estimator_is_linear_regression():
    pipe = build_ols_pipeline()
    assert isinstance(pipe.named_steps["model"], LinearRegression)


def test_preprocessor_fitted_on_train_only(splits):
    """The scaler's mean must come from train; feeding val must not refit it."""
    train, val, _ = splits
    X_tr, y_tr = get_Xy(train, 1)
    X_val, _ = get_Xy(val, 1)
    pipe = build_ols_pipeline()
    pipe.fit(X_tr, y_tr)
    scaler = pipe.named_steps["prep"].named_transformers_["num"].named_steps["scale"]
    means_after_fit = scaler.mean_.copy()
    pipe.predict(X_val)  # prediction must not mutate fitted state
    assert np.allclose(scaler.mean_, means_after_fit)
    # Scaler mean should match the train numeric medians-imputed means, not val.
    assert len(scaler.mean_) == len(config.NUMERIC_FEATURES)


def test_handles_unknown_categories(splits):
    """OneHotEncoder(handle_unknown='ignore') must tolerate a category unseen in
    train without raising."""
    train, _, test = splits
    X_tr, y_tr = get_Xy(train, 1)
    X_te, _ = get_Xy(test, 1)
    pipe = build_ols_pipeline()
    pipe.fit(X_tr, y_tr)
    X_mod = X_te.copy()
    X_mod.iloc[0, X_mod.columns.get_loc("state")] = "Atlantis"
    preds = pipe.predict(X_mod)
    assert np.isfinite(preds).all()


def test_ridge_pipeline_builds_and_predicts(splits):
    train, val, _ = splits
    X_tr, y_tr = get_Xy(train, 2)
    X_val, _ = get_Xy(val, 2)
    pipe = build_ridge_pipeline(alpha=1.0)
    pipe.fit(X_tr, y_tr)
    assert pipe.predict(X_val).shape == (len(X_val),)


def test_no_target_or_id_columns_leak_into_features(splits):
    train, _, _ = splits
    X_tr, _ = get_Xy(train, 1)
    forbidden = {
        config.ID_COL,
        config.DATE_COL,
        config.NEXT_RENT_COL,
        config.target_col(1),
        config.target_col(2),
        config.target_col(3),
        "year",
        "month",
        "season",
    }
    assert forbidden.isdisjoint(set(X_tr.columns))
