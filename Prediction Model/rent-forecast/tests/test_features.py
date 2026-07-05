"""Tests for target construction (no leakage), time encoding, and the
temporal split boundaries."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src import config
from src.features import (
    add_targets,
    add_time_features,
    build_dataset,
    get_Xy,
    temporal_split,
)


@pytest.fixture(scope="module")
def dataset():
    return build_dataset()


def _make_toy():
    """Two facilities, monthly, with a known increasing rent so shifts are
    trivial to verify."""
    rows = []
    for fid in ["A", "B"]:
        base = 1000 if fid == "A" else 2000
        for i in range(6):
            rows.append(
                {
                    config.ID_COL: fid,
                    config.DATE_COL: pd.Timestamp("2019-01-01")
                    + pd.offsets.MonthBegin(i),
                    "month": (i % 12) + 1,
                    config.CURRENT_RENT_COL: base + i * 10,
                    config.NEXT_RENT_COL: base + (i + 1) * 10,
                }
            )
    return pd.DataFrame(rows)


def test_targets_are_future_rows_of_same_facility():
    df = add_targets(_make_toy())
    a = df[df[config.ID_COL] == "A"].reset_index(drop=True)
    # t+2 target at row i must equal current_rent at row i+2.
    for i in range(len(a) - 2):
        assert a.loc[i, config.target_col(2)] == a.loc[i + 2, config.CURRENT_RENT_COL]
    for i in range(len(a) - 3):
        assert a.loc[i, config.target_col(3)] == a.loc[i + 3, config.CURRENT_RENT_COL]


def test_h1_target_matches_next_month_column():
    df = add_targets(_make_toy())
    assert (df[config.target_col(1)] == df[config.NEXT_RENT_COL]).all()


def test_shift_does_not_leak_across_facilities():
    """The last rows of facility A must not pull facility B's rents as targets;
    they become NaN and get dropped."""
    df = add_targets(_make_toy())
    a = df[df[config.ID_COL] == "A"]
    # Last 2 rows of A have no t+2 target within A.
    assert a[config.target_col(2)].isna().sum() == 2
    assert a[config.target_col(3)].isna().sum() == 3
    # No target value in A equals any B current rent (which are >= 2000).
    a_targets = a[config.target_col(2)].dropna()
    assert (a_targets < 2000).all()


def test_time_features_cyclical_and_trend():
    df = add_time_features(_make_toy())
    assert np.isclose(df["month_sin"] ** 2 + df["month_cos"] ** 2, 1.0).all()
    a = df[df[config.ID_COL] == "A"].sort_values(config.DATE_COL)
    # months_since_start increments by 1 per month, starting at 0.
    assert list(a["months_since_start"]) == [0, 1, 2, 3, 4, 5]


def test_temporal_split_boundaries(dataset):
    train, val, test = temporal_split(dataset)
    assert train[config.DATE_COL].max() <= config.TRAIN_END
    assert val[config.DATE_COL].min() >= config.VAL_START
    assert val[config.DATE_COL].max() <= config.VAL_END
    assert test[config.DATE_COL].min() >= config.TEST_START
    # Split is disjoint in time: train years <= 2023, val == 2024, test == 2025.
    assert set(train[config.DATE_COL].dt.year) <= set(range(2019, 2024))
    assert set(val[config.DATE_COL].dt.year) == {2024}
    assert set(test[config.DATE_COL].dt.year) == {2025}


def test_split_is_not_random_no_facility_row_overlap_in_time(dataset):
    """Every train row strictly precedes every test row in time (temporal, not
    random)."""
    train, _, test = temporal_split(dataset)
    assert train[config.DATE_COL].max() < test[config.DATE_COL].min()


def test_get_Xy_drops_nan_targets_and_shapes_align(dataset):
    train, _, _ = temporal_split(dataset)
    for h in config.HORIZONS:
        X, y = get_Xy(train, h)
        assert len(X) == len(y)
        assert not y.isna().any()
        assert list(X.columns) == config.ALL_FEATURES
