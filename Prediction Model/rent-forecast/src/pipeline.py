"""Leakage-proof preprocessing + model builders.

Every transform (impute, scale, one-hot) lives inside the sklearn Pipeline so
it is fitted on the training fold only. Numeric: median impute -> StandardScaler.
Categorical: most_frequent impute -> OneHotEncoder(drop='first', ignore unknown).
"""
from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from . import config


def build_preprocessor(numeric=None, categorical=None) -> ColumnTransformer:
    numeric = numeric if numeric is not None else config.NUMERIC_FEATURES
    categorical = categorical if categorical is not None else config.CATEGORICAL_FEATURES

    numeric_pipe = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]
    )
    categorical_pipe = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            (
                "onehot",
                OneHotEncoder(drop="first", handle_unknown="ignore"),
            ),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, numeric),
            ("cat", categorical_pipe, categorical),
        ],
        remainder="drop",
    )


def build_ols_pipeline(numeric=None, categorical=None) -> Pipeline:
    """Model A headline predictor: full-feature OLS (LinearRegression)."""
    return Pipeline(
        steps=[
            ("prep", build_preprocessor(numeric, categorical)),
            ("model", LinearRegression()),
        ]
    )


def build_ridge_pipeline(alpha: float, numeric=None, categorical=None) -> Pipeline:
    """Ridge variant for stabler coefficients; alpha tuned on 2024 validation."""
    return Pipeline(
        steps=[
            ("prep", build_preprocessor(numeric, categorical)),
            ("model", Ridge(alpha=alpha, random_state=config.RANDOM_STATE)),
        ]
    )
