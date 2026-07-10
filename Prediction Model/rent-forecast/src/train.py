"""Fit Model A (OLS) and a Ridge variant for each horizon.

For every horizon h in {1,2,3}:
  * Fit full-feature OLS on train (Jan 2019 - Dec 2023).
  * Fit Ridge over an alpha grid, select the alpha with best R2 on the 2024
    validation year, refit at that alpha.
  * Persist the OLS pipeline (headline predictor) to models/model_h{h}.joblib
    and the tuned Ridge to models/ridge_h{h}.joblib.
  * Record train + validation metrics for both to models/metrics.json.

All preprocessing is inside each Pipeline, so it is fitted on train only.
"""
from __future__ import annotations

import json

import joblib

from . import config
from .features import build_dataset, get_Xy, temporal_split
from .metrics import regression_metrics
from .pipeline import build_ols_pipeline, build_ridge_pipeline


def tune_ridge(X_tr, y_tr, X_val, y_val):
    """Grid-search Ridge alpha on the validation fold; return (best_pipe, alpha,
    per-alpha val R2)."""
    results = {}
    best_alpha, best_r2, best_pipe = None, -float("inf"), None
    for alpha in config.RIDGE_ALPHAS:
        pipe = build_ridge_pipeline(alpha)
        pipe.fit(X_tr, y_tr)
        r2 = regression_metrics(y_val, pipe.predict(X_val))["r2"]
        results[str(alpha)] = r2
        if r2 > best_r2:
            best_alpha, best_r2, best_pipe = alpha, r2, pipe
    return best_pipe, best_alpha, results


def main() -> dict:
    df = build_dataset()
    train, val, test = temporal_split(df)
    print(
        f"Rows -> train={len(train)} val={len(val)} test={len(test)} "
        f"(total usable {len(train) + len(val) + len(test)})"
    )

    metrics = {"horizons": {}}

    for h in config.HORIZONS:
        X_tr, y_tr = get_Xy(train, h)
        X_val, y_val = get_Xy(val, h)

        # --- Model A: full-feature OLS -------------------------------------- #
        ols = build_ols_pipeline()
        ols.fit(X_tr, y_tr)
        ols_train = regression_metrics(y_tr, ols.predict(X_tr))
        ols_val = regression_metrics(y_val, ols.predict(X_val))

        # --- Ridge: alpha tuned on 2024 validation -------------------------- #
        ridge, best_alpha, alpha_r2 = tune_ridge(X_tr, y_tr, X_val, y_val)
        ridge_train = regression_metrics(y_tr, ridge.predict(X_tr))
        ridge_val = regression_metrics(y_val, ridge.predict(X_val))

        joblib.dump(ols, config.MODELS_DIR / f"model_h{h}.joblib")
        joblib.dump(ridge, config.MODELS_DIR / f"ridge_h{h}.joblib")

        metrics["horizons"][f"h{h}"] = {
            "n_train": int(len(y_tr)),
            "n_val": int(len(y_val)),
            "ols": {"train": ols_train, "val": ols_val},
            "ridge": {
                "best_alpha": best_alpha,
                "val_r2_by_alpha": alpha_r2,
                "train": ridge_train,
                "val": ridge_val,
            },
        }
        print(
            f"h={h}  OLS val R2={ols_val['r2']:.4f} RMSE={ols_val['rmse']:.1f} | "
            f"Ridge(a={best_alpha}) val R2={ridge_val['r2']:.4f}"
        )

    out = config.MODELS_DIR / "metrics.json"
    out.write_text(json.dumps(metrics, indent=2))
    print(f"Saved models + {out}")
    return metrics


if __name__ == "__main__":
    main()
