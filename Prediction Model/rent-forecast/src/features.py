"""Dataset builder: load, sort, create leakage-proof targets, encode time,
and split temporally.

Leakage rules enforced here:
  * Targets are FUTURE rents of the SAME facility (groupby shift), never mixed
    across facilities.
  * The temporal split is by the feature-row date t; rows are never shuffled.
  * Rows near the end of each facility's history that lose their t+h target are
    dropped per horizon (done at get_Xy time).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config


def load_raw() -> pd.DataFrame:
    """Load the CSV, parse dates, drop the single corrupt row, and sort by
    facility then date (required for correct shifting)."""
    df = pd.read_csv(config.DATA_PATH, parse_dates=[config.DATE_COL])
    # One fully-blank row exists (null current_rent_rm/month/etc); it cannot be
    # a valid feature row or target source.
    df = df.dropna(subset=[config.CURRENT_RENT_COL, config.DATE_COL, "month"])
    df = df.sort_values([config.ID_COL, config.DATE_COL]).reset_index(drop=True)
    return df


def add_targets(df: pd.DataFrame) -> pd.DataFrame:
    """Create t+1, t+2, t+3 targets.

    t+1 uses the provided next_month_rent_rm (== next row's current_rent_rm).
    t+2 / t+3 are per-facility forward shifts of current_rent_rm so a target is
    ALWAYS a future observation of the same facility.
    """
    df = df.copy()
    df[config.target_col(1)] = df[config.NEXT_RENT_COL]
    grp = df.groupby(config.ID_COL, sort=False)[config.CURRENT_RENT_COL]
    df[config.target_col(2)] = grp.shift(-2)
    df[config.target_col(3)] = grp.shift(-3)
    return df


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Cyclical month encoding + integer trend counter.

    months_since_start is measured from the global earliest record date so the
    model learns a trend it can extrapolate past 2023 (unlike raw `year`).
    """
    df = df.copy()
    month = df["month"].astype(int)
    df["month_sin"] = np.sin(2 * np.pi * month / 12.0)
    df["month_cos"] = np.cos(2 * np.pi * month / 12.0)

    start = df[config.DATE_COL].min()
    df["months_since_start"] = (
        (df[config.DATE_COL].dt.year - start.year) * 12
        + (df[config.DATE_COL].dt.month - start.month)
    ).astype(int)
    return df


def build_dataset() -> pd.DataFrame:
    """Full builder: raw -> targets -> time features. Keeps id/date columns for
    splitting and diagnostics; feature selection happens in get_Xy."""
    df = load_raw()
    df = add_targets(df)
    df = add_time_features(df)
    return df


def temporal_split(df: pd.DataFrame):
    """Split by feature-row date t into (train, val, test). No shuffling."""
    d = df[config.DATE_COL]
    train = df[d <= config.TRAIN_END]
    val = df[(d >= config.VAL_START) & (d <= config.VAL_END)]
    test = df[(d >= config.TEST_START) & (d <= config.TEST_END)]
    return train.copy(), val.copy(), test.copy()


def get_Xy(df: pd.DataFrame, horizon: int, features: list[str] | None = None):
    """Return (X, y) for a horizon, dropping rows whose target is NaN (end of a
    facility's history). Feature columns default to the full Model A set."""
    features = features if features is not None else config.ALL_FEATURES
    tgt = config.target_col(horizon)
    sub = df.dropna(subset=[tgt])
    X = sub[features].copy()
    y = sub[tgt].copy()
    return X, y
