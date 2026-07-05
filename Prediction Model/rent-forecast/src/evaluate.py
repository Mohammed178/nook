"""Evaluate saved models on the untouched 2025 test year.

Reports R2/RMSE/MAE/MAPE per horizon for the OLS model vs two baselines:
  * Naive: rent(t+h) = rent(t)
  * Drift: rent(t+h) = rent(t) * (1 + g)^h, g = current/previous_month - 1
Saves reports/test_metrics.json, reports/test_metrics.csv, and diagnostic plots.
"""
from __future__ import annotations

import json

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import scipy.stats as stats

from . import config
from .features import build_dataset, get_Xy, temporal_split
from .metrics import regression_metrics


def naive_pred(sub: pd.DataFrame) -> np.ndarray:
    return sub[config.CURRENT_RENT_COL].to_numpy(dtype=float)


def drift_pred(sub: pd.DataFrame, horizon: int) -> np.ndarray:
    cur = sub[config.CURRENT_RENT_COL].to_numpy(dtype=float)
    prev = sub["previous_month_rent"].to_numpy(dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        g = np.where(prev > 0, cur / prev - 1.0, 0.0)
    g = np.nan_to_num(g, nan=0.0)
    # Cap extreme monthly growth so the compounded baseline stays sane.
    g = np.clip(g, -0.5, 0.5)
    return cur * (1.0 + g) ** horizon


def price_band(series: pd.Series) -> pd.Series:
    return pd.cut(
        series,
        bins=[0, 1500, 2500, 4000, np.inf],
        labels=["<1.5k", "1.5-2.5k", "2.5-4k", ">4k"],
    )


def main() -> dict:
    df = build_dataset()
    _, _, test = temporal_split(df)

    summary = {"horizons": {}}
    rows_for_csv = []

    # For example-facility plots: pick facilities with full 2025 coverage.
    example_ids = None

    for h in config.HORIZONS:
        model = joblib.load(config.MODELS_DIR / f"model_h{h}.joblib")
        ridge = joblib.load(config.MODELS_DIR / f"ridge_h{h}.joblib")
        tgt = config.target_col(h)
        sub = test.dropna(subset=[tgt]).copy()
        X = sub[config.ALL_FEATURES]
        y = sub[tgt].to_numpy(dtype=float)

        y_hat = model.predict(X)
        y_ridge = ridge.predict(X)

        m_model = regression_metrics(y, y_hat)
        m_ridge = regression_metrics(y, y_ridge)
        m_naive = regression_metrics(y, naive_pred(sub))
        m_drift = regression_metrics(y, drift_pred(sub, h))

        summary["horizons"][f"h{h}"] = {
            "n_test": int(len(y)),
            "ols": m_model,
            "ridge": m_ridge,
            "naive": m_naive,
            "drift": m_drift,
            "beats_naive": m_model["rmse"] < m_naive["rmse"],
            "beats_drift": m_model["rmse"] < m_drift["rmse"],
        }
        for name, mm in [
            ("ols", m_model),
            ("ridge", m_ridge),
            ("naive", m_naive),
            ("drift", m_drift),
        ]:
            rows_for_csv.append({"horizon": h, "model": name, **mm})

        print(
            f"h={h} test  OLS R2={m_model['r2']:.4f} RMSE={m_model['rmse']:.1f} | "
            f"naive R2={m_naive['r2']:.4f} | drift R2={m_drift['r2']:.4f} | "
            f"beats naive={m_model['rmse'] < m_naive['rmse']} "
            f"drift={m_model['rmse'] < m_drift['rmse']}"
        )

        # --- diagnostics dataframe --------------------------------------- #
        sub = sub.assign(
            y_true=y,
            y_pred=y_hat,
            resid=y - y_hat,
            band=price_band(sub[config.CURRENT_RENT_COL]),
        )
        _plot_diagnostics(sub, h)
        _plot_error_breakdowns(sub, h)

        if example_ids is None:
            counts = sub.groupby(config.ID_COL).size().sort_values(ascending=False)
            example_ids = list(counts.head(4).index)
        _plot_example_facilities(sub, h, example_ids)

    (config.REPORTS_DIR / "test_metrics.json").write_text(json.dumps(summary, indent=2))
    pd.DataFrame(rows_for_csv).to_csv(
        config.REPORTS_DIR / "test_metrics.csv", index=False
    )
    print(f"Saved reports to {config.REPORTS_DIR}")
    return summary


def _plot_diagnostics(sub: pd.DataFrame, h: int) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    axes[0].scatter(sub["y_pred"], sub["resid"], s=6, alpha=0.3)
    axes[0].axhline(0, color="red", lw=1)
    axes[0].set_xlabel("Fitted (predicted rent, RM)")
    axes[0].set_ylabel("Residual (actual - predicted)")
    axes[0].set_title(f"Residuals vs Fitted (h={h})")

    stats.probplot(sub["resid"], dist="norm", plot=axes[1])
    axes[1].set_title(f"Q-Q plot of residuals (h={h})")
    fig.tight_layout()
    fig.savefig(config.REPORTS_DIR / f"diagnostics_h{h}.png", dpi=110)
    plt.close(fig)


def _plot_error_breakdowns(sub: pd.DataFrame, h: int) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    by_state = (
        sub.assign(abs_err=sub["resid"].abs())
        .groupby("state")["abs_err"]
        .mean()
        .sort_values()
    )
    by_state.plot.barh(ax=axes[0], color="#3b6ea5")
    axes[0].set_xlabel("MAE (RM)")
    axes[0].set_title(f"MAE by state (h={h})")

    by_band = (
        sub.assign(abs_err=sub["resid"].abs())
        .groupby("band", observed=True)["abs_err"]
        .mean()
    )
    by_band.plot.bar(ax=axes[1], color="#a5643b")
    axes[1].set_xlabel("Price band (current rent)")
    axes[1].set_ylabel("MAE (RM)")
    axes[1].set_title(f"MAE by price band (h={h})")
    axes[1].tick_params(axis="x", rotation=0)
    fig.tight_layout()
    fig.savefig(config.REPORTS_DIR / f"error_breakdown_h{h}.png", dpi=110)
    plt.close(fig)


def _plot_example_facilities(sub: pd.DataFrame, h: int, ids: list) -> None:
    fig, axes = plt.subplots(len(ids), 1, figsize=(10, 3 * len(ids)), squeeze=False)
    for ax, fid in zip(axes[:, 0], ids):
        f = sub[sub[config.ID_COL] == fid].sort_values(config.DATE_COL)
        # Target date is the feature date shifted forward h months.
        tdate = f[config.DATE_COL] + pd.offsets.DateOffset(months=h)
        ax.plot(tdate, f["y_true"], marker="o", label="actual", color="#222")
        ax.plot(tdate, f["y_pred"], marker="x", label="predicted", color="#c0392b")
        ax.set_title(f"{fid} — actual vs predicted rent at t+{h} (2025)")
        ax.set_ylabel("RM")
        ax.legend()
    fig.tight_layout()
    fig.savefig(config.REPORTS_DIR / f"examples_h{h}.png", dpi=110)
    plt.close(fig)


if __name__ == "__main__":
    main()
