"""Model B (interpretation): statsmodels OLS on a reduced, de-collinearised
feature set for each horizon.

Reduced set keeps current_rent_rm and rent_growth_last_year but drops the three
collinear rolling/lag features (previous_month_rent, previous_3m_average,
previous_6m_average). Numeric features are standardized so coefficients are
directly comparable ("which factor moves rent most"). Outputs, per horizon:
  * reports/coefficients_h{h}.csv  — coef, std err, t, p-value, 95% CI, VIF
Prints the top standardized coefficients and any feature with VIF >= 10.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from statsmodels.stats.outliers_influence import variance_inflation_factor

from . import config
from .features import build_dataset, get_Xy, temporal_split


def _build_design(X: pd.DataFrame):
    """Fit-transform the reduced design matrix on the given (train) frame.
    Numeric: median impute -> standardize. Categorical: most_frequent impute ->
    one-hot(drop first). Returns (DataFrame with named columns, fitted ct)."""
    numeric_pipe = Pipeline(
        [("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]
    )
    categorical_pipe = Pipeline(
        [
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(drop="first", handle_unknown="ignore")),
        ]
    )
    ct = ColumnTransformer(
        [
            ("num", numeric_pipe, config.MODEL_B_NUMERIC),
            ("cat", categorical_pipe, config.MODEL_B_CATEGORICAL),
        ]
    )
    arr = ct.fit_transform(X)
    if hasattr(arr, "toarray"):
        arr = arr.toarray()
    names = list(ct.get_feature_names_out())
    design = pd.DataFrame(arr, columns=names, index=X.index)
    return design, ct


def fit_horizon(train: pd.DataFrame, horizon: int) -> pd.DataFrame:
    X, y = get_Xy(train, horizon, features=config.MODEL_B_NUMERIC + config.MODEL_B_CATEGORICAL)
    design, _ = _build_design(X)

    Xc = sm.add_constant(design, has_constant="add")
    ols = sm.OLS(y.to_numpy(dtype=float), Xc).fit()

    conf = ols.conf_int(alpha=0.05)
    table = pd.DataFrame(
        {
            "feature": Xc.columns,
            "coef": ols.params.to_numpy(),
            "std_err": ols.bse.to_numpy(),
            "t": ols.tvalues.to_numpy(),
            "p_value": ols.pvalues.to_numpy(),
            "ci_low": conf.iloc[:, 0].to_numpy(),
            "ci_high": conf.iloc[:, 1].to_numpy(),
        }
    )

    # VIF on the design matrix including the constant (standard recommendation).
    vif_vals = []
    arr = Xc.to_numpy(dtype=float)
    for i, name in enumerate(Xc.columns):
        vif_vals.append(np.nan if name == "const" else variance_inflation_factor(arr, i))
    table["vif"] = vif_vals

    table["r2"] = ols.rsquared
    table["adj_r2"] = ols.rsquared_adj
    out = config.REPORTS_DIR / f"coefficients_h{horizon}.csv"
    table.to_csv(out, index=False)

    # --- console summary --------------------------------------------------- #
    body = table[table["feature"] != "const"].copy()
    body["abs_coef"] = body["coef"].abs()
    top = body.sort_values("abs_coef", ascending=False).head(10)
    print(f"\n=== Model B h={horizon}  (R2={ols.rsquared:.4f}) top 10 |coef| ===")
    for _, r in top.iterrows():
        print(
            f"  {r['feature']:32s} coef={r['coef']:+9.2f} "
            f"p={r['p_value']:.3g} VIF={r['vif']:.2f}"
        )
    high_vif = body[body["vif"] >= 10]
    if len(high_vif):
        print(f"  VIF>=10: {list(high_vif['feature'])}")
    else:
        print("  VIF>=10: none")
    return table


def main() -> dict:
    df = build_dataset()
    train, _, _ = temporal_split(df)
    tables = {}
    for h in config.HORIZONS:
        tables[h] = fit_horizon(train, h)
    print(f"\nSaved coefficient tables to {config.REPORTS_DIR}")
    return tables


if __name__ == "__main__":
    main()
