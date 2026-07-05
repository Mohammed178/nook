"""
01_eda.py — Exploratory Data Analysis for the Malaysia rental panel
===================================================================

Phase 1 deliverable for the 3-month rental price prediction project
(see rent_prediction_model_plan.md, sections 3, 4, 10).

This script loads data/malaysia_rental_panel.csv (a monthly facility-level
panel) and produces every chart required for the FYP report chapter into
reports/eda/ as 150-dpi PNGs, plus a machine-readable stats dump
(reports/eda/eda_stats.txt) that backs the written EDA_FINDINGS.md.

It is intentionally written as a linear, well-commented script so it can be
run end-to-end (`python notebooks/01_eda.py`) and mirrors the companion
notebook 01_eda.ipynb.

Only reads data/ ; only writes reports/eda/ . Does not touch src/, models/,
api/ or tests/.
"""

from __future__ import annotations

import os
import textwrap
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")  # headless backend: we only save PNGs, never show()
import matplotlib.pyplot as plt
import seaborn as sns

# --------------------------------------------------------------------------
# 0. Paths & global style
# --------------------------------------------------------------------------
# Resolve paths relative to this file so the script runs from any CWD.
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DATA_PATH = ROOT / "data" / "malaysia_rental_panel.csv"
OUT = ROOT / "reports" / "eda"
OUT.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid", context="notebook")
plt.rcParams["figure.dpi"] = 110
plt.rcParams["savefig.dpi"] = 150
plt.rcParams["savefig.bbox"] = "tight"
plt.rcParams["axes.titleweight"] = "bold"

TARGET = "current_rent_rm"
LAG_FEATURES = [
    "current_rent_rm",
    "previous_month_rent",
    "previous_3m_average",
    "previous_6m_average",
]

# Collect human-readable findings here; flushed to eda_stats.txt at the end.
_notes: list[str] = []


def note(line: str = "") -> None:
    """Record a finding line (also echoed to stdout)."""
    print(line)
    _notes.append(line)


def save(fig: plt.Figure, name: str) -> None:
    """Save a figure into reports/eda/ and close it."""
    path = OUT / name
    fig.savefig(path)
    plt.close(fig)
    print(f"  [saved] {path.name}")


# --------------------------------------------------------------------------
# 1. Load & basic shape
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 1 — LOAD & SHAPE")
note("=" * 70)

df = pd.read_csv(DATA_PATH, parse_dates=["record_date"])
df = df.sort_values(["facility_id", "record_date"]).reset_index(drop=True)

raw_rows = len(df)

# Data-quality guard: the CSV's final line is truncated mid-record, producing
# one corrupt row where cpi_index is misaligned and current_rent_rm (and
# everything after it) is NaN. A row with no target is useless for modeling and
# breaks month-based grouping, so drop rows with a missing target here and
# report how many were removed.
corrupt = df[df[TARGET].isna()]
if len(corrupt) > 0:
    note(f"WARNING: {len(corrupt)} row(s) have NaN {TARGET} "
         f"(truncated/corrupt records) — dropping them.")
    for _, r in corrupt.iterrows():
        note(f"    dropped: {r['facility_id']} @ "
             f"{pd.Timestamp(r['record_date']).date()}")
    df = df[df[TARGET].notna()].reset_index(drop=True)
# month is float while the corrupt NaN row is present; restore integer dtype.
df["month"] = df["month"].astype(int)

n_rows, n_cols = df.shape
n_fac = df["facility_id"].nunique()
note(f"Raw rows parsed: {raw_rows:,}  ->  clean rows: {n_rows:,}")
note(f"Rows: {n_rows:,}   Columns: {n_cols}   Facilities: {n_fac:,}")
note(
    f"Date range: {df['record_date'].min().date()} "
    f"to {df['record_date'].max().date()}"
)
note(f"States: {df['state'].nunique()}   Districts: {df['district'].nunique()}")
note(f"Property types: {sorted(df['property_type'].unique().tolist())}")
note(f"Furnished levels: {sorted(df['furnished'].unique().tolist())}")
note("")

# Numeric columns (used repeatedly below).
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()


# --------------------------------------------------------------------------
# 2. Rent distribution (overall + by state) & facilities per state
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 2 — RENT DISTRIBUTION")
note("=" * 70)

rent = df[TARGET]
skew = rent.skew()
note(
    f"{TARGET}: min={rent.min():,.0f}  median={rent.median():,.0f}  "
    f"mean={rent.mean():,.0f}  max={rent.max():,.0f}  skew={skew:.2f}"
)
q = rent.quantile([0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99])
note("Quantiles (RM): " + ", ".join(f"{p:.0%}={v:,.0f}" for p, v in q.items()))

# 2a. Overall distribution: linear vs log10 side by side (rent is right-skewed).
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
sns.histplot(rent, bins=60, ax=axes[0], color="#4C72B0")
axes[0].set_title(f"Rent distribution (linear)  skew={skew:.2f}")
axes[0].set_xlabel("current_rent_rm (RM/month)")
sns.histplot(np.log10(rent), bins=60, ax=axes[1], color="#55A868")
axes[1].set_title("Rent distribution (log10)")
axes[1].set_xlabel("log10(current_rent_rm)")
fig.suptitle("Overall monthly rent distribution", fontsize=14)
save(fig, "01_rent_distribution_overall.png")

# 2b. Rent by state (log y — spread across states is wide).
state_order = (
    df.groupby("state")[TARGET].median().sort_values(ascending=False).index.tolist()
)
fig, ax = plt.subplots(figsize=(13, 6))
sns.boxplot(data=df, x="state", y=TARGET, order=state_order, ax=ax,
            palette="viridis", showfliers=False)
ax.set_yscale("log")
ax.set_title("Rent by state (log scale, outliers hidden)")
ax.set_xlabel("State")
ax.set_ylabel("current_rent_rm (RM/month, log)")
ax.tick_params(axis="x", rotation=45)
for lbl in ax.get_xticklabels():
    lbl.set_ha("right")
save(fig, "02_rent_by_state.png")

med_by_state = df.groupby("state")[TARGET].median().sort_values(ascending=False)
note("Median rent by state (RM): " +
     ", ".join(f"{s}={v:,.0f}" for s, v in med_by_state.items()))

# 2c. Facilities per state (count of distinct facilities, not rows).
fac_per_state = (
    df.groupby("state")["facility_id"].nunique().sort_values(ascending=False)
)
fig, ax = plt.subplots(figsize=(13, 6))
sns.barplot(x=fac_per_state.index, y=fac_per_state.values, ax=ax,
            palette="crest")
ax.set_title("Number of distinct facilities per state")
ax.set_xlabel("State")
ax.set_ylabel("Facilities")
ax.tick_params(axis="x", rotation=45)
for lbl in ax.get_xticklabels():
    lbl.set_ha("right")
for i, v in enumerate(fac_per_state.values):
    ax.text(i, v, str(int(v)), ha="center", va="bottom", fontsize=8)
save(fig, "03_facilities_per_state.png")
note("Facilities per state: " +
     ", ".join(f"{s}={int(v)}" for s, v in fac_per_state.items()))
note("")


# --------------------------------------------------------------------------
# 3. Rent trends over time (overall + per state) with COVID annotation
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 3 — RENT TRENDS OVER TIME")
note("=" * 70)

monthly_med = df.groupby("record_date")[TARGET].median()

# 3a. Overall median rent by month, annotate the COVID window (2020-2021).
fig, ax = plt.subplots(figsize=(13, 6))
ax.plot(monthly_med.index, monthly_med.values, color="#C44E52", lw=2)
ax.set_title("Overall median rent by month (2019–2025)")
ax.set_xlabel("Month")
ax.set_ylabel("Median current_rent_rm (RM)")

# Shade the COVID window and label the observed dip.
covid_start = pd.Timestamp("2020-03-01")
covid_end = pd.Timestamp("2021-06-01")
ax.axvspan(covid_start, covid_end, color="grey", alpha=0.15,
           label="COVID window 2020-03 → 2021-06")
covid_slice = monthly_med.loc[covid_start:covid_end]
if not covid_slice.empty:
    trough_date = covid_slice.idxmin()
    trough_val = covid_slice.min()
    pre = monthly_med.loc[:covid_start]
    pre_peak = pre.max() if not pre.empty else np.nan
    ax.scatter([trough_date], [trough_val], color="black", zorder=5)
    ax.annotate(
        f"COVID trough\n{trough_date.date()}  RM{trough_val:,.0f}",
        xy=(trough_date, trough_val),
        xytext=(trough_date, trough_val * 0.9),
        arrowprops=dict(arrowstyle="->", color="black"),
        ha="center", fontsize=9,
    )
    dip_pct = (trough_val - pre_peak) / pre_peak * 100 if pre_peak else np.nan
    note(f"Pre-COVID peak median: RM{pre_peak:,.0f}")
    note(f"COVID trough: {trough_date.date()} at RM{trough_val:,.0f} "
         f"({dip_pct:+.1f}% vs pre-COVID peak)")
ax.legend(loc="best")
save(fig, "04_rent_trend_overall.png")

# 3b. Median rent by month per state (top states by facility count for clarity).
top_states = fac_per_state.head(8).index.tolist()
fig, ax = plt.subplots(figsize=(13, 7))
for st in top_states:
    s = df[df["state"] == st].groupby("record_date")[TARGET].median()
    ax.plot(s.index, s.values, lw=1.6, label=st)
ax.axvspan(covid_start, covid_end, color="grey", alpha=0.12)
ax.set_title("Median rent by month, top states")
ax.set_xlabel("Month")
ax.set_ylabel("Median current_rent_rm (RM)")
ax.legend(ncol=2, fontsize=8)
save(fig, "05_rent_trend_by_state.png")

# Year-over-year median levels for the narrative.
yr_med = df.assign(yr=df["record_date"].dt.year).groupby("yr")[TARGET].median()
note("Median rent by year (RM): " +
     ", ".join(f"{int(y)}={v:,.0f}" for y, v in yr_med.items()))
note("")


# --------------------------------------------------------------------------
# 4. Rent by district / property attributes
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 4 — RENT BY DISTRICT & PROPERTY ATTRIBUTES")
note("=" * 70)

# 4a. Top districts by facility count; median rent within them.
dist_counts = df.groupby("district")["facility_id"].nunique().sort_values(
    ascending=False)
top_districts = dist_counts.head(15).index.tolist()
dsub = df[df["district"].isin(top_districts)]
dist_order = (
    dsub.groupby("district")[TARGET].median().sort_values(ascending=False).index
)
fig, ax = plt.subplots(figsize=(13, 7))
sns.boxplot(data=dsub, y="district", x=TARGET, order=dist_order, ax=ax,
            palette="mako", showfliers=False)
ax.set_title("Rent by district (top 15 districts by facility count)")
ax.set_xlabel("current_rent_rm (RM/month)")
ax.set_ylabel("District")
save(fig, "06_rent_by_district.png")

# 4b. Rent vs floor area (scatter, sampled to keep the PNG light).
sample = df.sample(min(4000, len(df)), random_state=42)
fig, ax = plt.subplots(figsize=(11, 6))
sns.scatterplot(data=sample, x="floor_area_sqft", y=TARGET, s=10, alpha=0.3,
                ax=ax, color="#4C72B0")
ax.set_title("Rent vs floor area")
ax.set_xlabel("floor_area_sqft")
ax.set_ylabel("current_rent_rm (RM)")
corr_area = df["floor_area_sqft"].corr(df[TARGET])
ax.text(0.02, 0.95, f"Pearson r = {corr_area:.2f}", transform=ax.transAxes,
        va="top", fontsize=10,
        bbox=dict(boxstyle="round", fc="white", alpha=0.8))
save(fig, "07_rent_vs_floor_area.png")

# 4c. Rent by bedrooms / furnished / property_type (three-panel).
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
sns.boxplot(data=df, x="bedrooms", y=TARGET, ax=axes[0], palette="flare",
            showfliers=False)
axes[0].set_title("Rent by bedrooms")
axes[0].set_ylabel("current_rent_rm (RM)")

furn_order = df.groupby("furnished")[TARGET].median().sort_values().index
sns.boxplot(data=df, x="furnished", y=TARGET, order=furn_order, ax=axes[1],
            palette="flare", showfliers=False)
axes[1].set_title("Rent by furnished status")
axes[1].tick_params(axis="x", rotation=20)

pt_order = df.groupby("property_type")[TARGET].median().sort_values().index
sns.boxplot(data=df, x="property_type", y=TARGET, order=pt_order, ax=axes[2],
            palette="flare", showfliers=False)
axes[2].set_title("Rent by property type")
axes[2].tick_params(axis="x", rotation=20)
fig.suptitle("Rent by key property attributes", fontsize=14)
save(fig, "08_rent_by_property_attributes.png")

note(f"Pearson r(floor_area, rent) = {corr_area:.3f}")
note("Median rent by furnished: " + ", ".join(
    f"{k}={v:,.0f}" for k, v in
    df.groupby('furnished')[TARGET].median().sort_values().items()))
note("Median rent by property_type: " + ", ".join(
    f"{k}={v:,.0f}" for k, v in
    df.groupby('property_type')[TARGET].median().sort_values().items()))
note("Median rent by bedrooms: " + ", ".join(
    f"{int(k)}BR={v:,.0f}" for k, v in
    df.groupby('bedrooms')[TARGET].median().items()))
note("")


# --------------------------------------------------------------------------
# 5. Correlation heatmap + lag-feature collinearity
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 5 — CORRELATIONS")
note("=" * 70)

corr = df[numeric_cols].corr()

# 5a. Full numeric correlation heatmap.
fig, ax = plt.subplots(figsize=(15, 13))
sns.heatmap(corr, cmap="coolwarm", center=0, annot=False, ax=ax,
            square=False, cbar_kws={"shrink": 0.6})
ax.set_title("Correlation heatmap — all numeric features")
save(fig, "09_correlation_heatmap_full.png")

# 5b. Ranked correlation of every numeric feature vs the target.
target_corr = corr[TARGET].drop(TARGET).sort_values()
fig, ax = plt.subplots(figsize=(10, 11))
colors = ["#C44E52" if v < 0 else "#4C72B0" for v in target_corr.values]
ax.barh(target_corr.index, target_corr.values, color=colors)
ax.set_title(f"Correlation of numeric features with {TARGET}")
ax.set_xlabel("Pearson r")
ax.axvline(0, color="black", lw=0.8)
save(fig, "10_corr_with_target.png")

# 5c. Lag-feature collinearity — the crux of the plan's two-model design.
lag_corr = df[LAG_FEATURES].corr()
fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(lag_corr, cmap="Reds", vmin=0.8, vmax=1.0, annot=True, fmt=".3f",
            ax=ax, square=True, cbar_kws={"shrink": 0.8})
ax.set_title("Lag-feature collinearity (>0.95 motivates 2-model design)")
save(fig, "11_lag_feature_collinearity.png")

note("Top +correlations with target:")
for k, v in target_corr.sort_values(ascending=False).head(8).items():
    note(f"    {k:<28} r={v:+.3f}")
note("Top -correlations with target:")
for k, v in target_corr.sort_values().head(6).items():
    note(f"    {k:<28} r={v:+.3f}")
note("Lag-feature pairwise correlations (all should be >0.95):")
pairs = [(a, b) for i, a in enumerate(LAG_FEATURES) for b in LAG_FEATURES[i + 1:]]
for a, b in pairs:
    r = lag_corr.loc[a, b]
    flag = "  <-- >0.95" if r > 0.95 else ""
    note(f"    r({a}, {b}) = {r:.4f}{flag}")
note("")


# --------------------------------------------------------------------------
# 6. Missing value audit
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 6 — MISSING VALUE AUDIT")
note("=" * 70)

miss = df.isna().sum()
miss = miss[miss > 0].sort_values(ascending=False)
miss_frac = (miss / len(df) * 100).round(3)

if len(miss) == 0:
    note("No missing values detected in any column.")
    fig, ax = plt.subplots(figsize=(8, 3))
    ax.text(0.5, 0.5, "No missing values in dataset", ha="center", va="center",
            fontsize=14)
    ax.axis("off")
    save(fig, "12_missing_values.png")
else:
    fig, ax = plt.subplots(figsize=(11, 5))
    sns.barplot(x=miss_frac.values, y=miss_frac.index, ax=ax, palette="rocket")
    ax.set_title("Missing values by column (% of rows)")
    ax.set_xlabel("% missing")
    for i, v in enumerate(miss_frac.values):
        ax.text(v, i, f" {v:.2f}%", va="center", fontsize=9)
    save(fig, "12_missing_values.png")
    note("Columns with missing values (count, %):")
    for c in miss.index:
        note(f"    {c:<30} {int(miss[c]):>6}  ({miss_frac[c]:.3f}%)")
    # Rows with at least one NaN.
    any_na = df.isna().any(axis=1).sum()
    note(f"Rows with >=1 NaN: {any_na:,} ({any_na/len(df)*100:.3f}%)")
note("")


# --------------------------------------------------------------------------
# 7. Seasonality — average rent growth by calendar month
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 7 — SEASONALITY (rent growth by calendar month)")
note("=" * 70)

# Month-over-month growth per facility, then average by calendar month.
df["mom_growth_pct"] = (
    df.groupby("facility_id")[TARGET].pct_change() * 100
)
seasonal = df.groupby("month")["mom_growth_pct"].mean()
month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

fig, ax = plt.subplots(figsize=(12, 6))
colors = ["#55A868" if v >= 0 else "#C44E52" for v in seasonal.values]
ax.bar([month_labels[m - 1] for m in seasonal.index], seasonal.values,
       color=colors)
ax.axhline(0, color="black", lw=0.8)
ax.set_title("Average month-over-month rent growth by calendar month")
ax.set_xlabel("Calendar month")
ax.set_ylabel("Mean MoM rent growth (%)")
for i, v in enumerate(seasonal.values):
    ax.text(i, v, f"{v:+.2f}", ha="center",
            va="bottom" if v >= 0 else "top", fontsize=8)
save(fig, "13_seasonality_growth.png")

note("Mean MoM rent growth by month (%):")
for m, v in seasonal.items():
    note(f"    {month_labels[m-1]}: {v:+.3f}%")
peak_months = seasonal.sort_values(ascending=False).head(3).index.tolist()
note(f"Highest-growth months: "
     f"{[month_labels[m-1] for m in peak_months]}")
note("(Plan section 4 claims Jan and Sep/Oct demand peaks.)")

# Also chart the dataset's own rent_growth_last_year by month for cross-check.
if "rent_growth_last_year" in df.columns:
    rgly = df.groupby("month")["rent_growth_last_year"].mean()
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.bar([month_labels[m - 1] for m in rgly.index], rgly.values,
           color="#4C72B0")
    ax.axhline(0, color="black", lw=0.8)
    ax.set_title("Mean rent_growth_last_year (dataset column) by calendar month")
    ax.set_xlabel("Calendar month")
    ax.set_ylabel("Mean rent_growth_last_year")
    save(fig, "14_rent_growth_last_year_by_month.png")
note("")


# --------------------------------------------------------------------------
# 8. Macro overlay — median rent vs inflation / OPR over time
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 8 — MACRO OVERLAY")
note("=" * 70)

macro = df.groupby("record_date").agg(
    med_rent=(TARGET, "median"),
    inflation_rate=("inflation_rate", "mean"),
    opr_rate=("opr_rate", "mean"),
    cpi_index=("cpi_index", "mean"),
    unemployment_rate=("unemployment_rate", "mean"),
)

fig, ax1 = plt.subplots(figsize=(13, 6))
ax1.plot(macro.index, macro["med_rent"], color="#C44E52", lw=2,
         label="Median rent (RM)")
ax1.set_xlabel("Month")
ax1.set_ylabel("Median current_rent_rm (RM)", color="#C44E52")
ax1.tick_params(axis="y", labelcolor="#C44E52")
ax1.axvspan(covid_start, covid_end, color="grey", alpha=0.12)

ax2 = ax1.twinx()
ax2.plot(macro.index, macro["inflation_rate"], color="#4C72B0", lw=1.5,
         label="Inflation rate (%)")
ax2.plot(macro.index, macro["opr_rate"], color="#55A868", lw=1.5,
         ls="--", label="OPR rate (%)")
ax2.set_ylabel("Inflation / OPR (%)", color="#4C72B0")
ax2.tick_params(axis="y", labelcolor="#4C72B0")

lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left", fontsize=9)
ax1.set_title("Median rent vs macro indicators over time")
save(fig, "15_macro_overlay.png")

# Correlations between monthly median rent and each macro series (time-level).
for col in ["inflation_rate", "opr_rate", "cpi_index", "unemployment_rate"]:
    r = macro["med_rent"].corr(macro[col])
    note(f"corr(median rent, {col}) over time = {r:+.3f}")
note("")


# --------------------------------------------------------------------------
# 9. Panel integrity checks
# --------------------------------------------------------------------------
note("=" * 70)
note("SECTION 9 — PANEL INTEGRITY")
note("=" * 70)

# 9a. Rows per facility (should be ~84 = Jan 2019..Dec 2025).
rows_per_fac = df.groupby("facility_id").size()
note(f"Rows per facility: min={rows_per_fac.min()}  "
     f"median={rows_per_fac.median():.0f}  max={rows_per_fac.max()}  "
     f"mean={rows_per_fac.mean():.2f}")
note(f"Facilities with exactly 84 rows: "
     f"{(rows_per_fac == 84).sum()} / {n_fac}")
vc = rows_per_fac.value_counts().sort_index()
note("Distribution of rows-per-facility: " +
     ", ".join(f"{k}rows×{v}fac" for k, v in vc.items()))

fig, ax = plt.subplots(figsize=(10, 5))
sns.histplot(rows_per_fac.values, bins=30, ax=ax, color="#4C72B0")
ax.set_title("Rows per facility (target ≈ 84 months)")
ax.set_xlabel("Number of monthly rows")
ax.set_ylabel("Facilities")
ax.axvline(84, color="red", ls="--", lw=1, label="84 months")
ax.legend()
save(fig, "16_rows_per_facility.png")

# 9b. Duplicate facility-month rows.
dup = df.duplicated(subset=["facility_id", "record_date"]).sum()
note(f"Duplicate (facility_id, record_date) rows: {dup}")

# 9c. Gaps in the monthly sequence per facility.
gap_facilities = 0
total_gaps = 0
for fac, g in df.groupby("facility_id"):
    dates = g["record_date"].sort_values()
    # Expected months between first and last (inclusive).
    expected = pd.period_range(dates.min(), dates.max(), freq="M")
    actual = dates.dt.to_period("M")
    missing = len(expected) - actual.nunique()
    if missing > 0:
        gap_facilities += 1
        total_gaps += missing
note(f"Facilities with gaps in their monthly sequence: {gap_facilities}")
note(f"Total missing months across all facilities: {total_gaps}")

# 9d. Internal consistency: next_month_rent_rm(t) == current_rent_rm(t+1)?
df_c = df.sort_values(["facility_id", "record_date"]).copy()
df_c["current_next"] = df_c.groupby("facility_id")[TARGET].shift(-1)
# Only compare rows that actually have a following month (not last per facility).
mask = df_c["current_next"].notna()
comparable = int(mask.sum())
# Also require the next row to be exactly one month later (guard against gaps).
df_c["next_date"] = df_c.groupby("facility_id")["record_date"].shift(-1)
one_month = (
    (df_c["next_date"].dt.to_period("M") -
     df_c["record_date"].dt.to_period("M")).apply(
        lambda x: x.n if pd.notna(x) else np.nan) == 1
)
valid = mask & one_month
diff = (df_c.loc[valid, "next_month_rent_rm"] -
        df_c.loc[valid, "current_next"]).abs()
tol = 1e-6
violations = int((diff > tol).sum())
n_valid = int(valid.sum())
viol_rate = violations / n_valid * 100 if n_valid else float("nan")
note(f"Consistency check next_month_rent_rm(t) == current_rent_rm(t+1):")
note(f"    comparable consecutive pairs: {n_valid:,}")
note(f"    violations (|diff|>{tol}): {violations:,} ({viol_rate:.3f}%)")
if violations:
    note(f"    max abs diff among violations: RM{diff.max():,.2f}")
    note(f"    median abs diff among violations: RM{diff[diff > tol].median():,.2f}")

# 9e. Outlier scan on the target (IQR rule).
Q1, Q3 = rent.quantile(0.25), rent.quantile(0.75)
IQR = Q3 - Q1
lo, hi = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
outliers = int(((rent < lo) | (rent > hi)).sum())
note(f"Target outliers (1.5*IQR rule): {outliers:,} "
     f"({outliers/len(df)*100:.2f}%)  bounds=[{lo:,.0f}, {hi:,.0f}]")

# Non-positive rents (would break log models).
nonpos = int((rent <= 0).sum())
note(f"Non-positive current_rent_rm rows: {nonpos}")
note("")


# --------------------------------------------------------------------------
# 10. Flush findings to a text file backing EDA_FINDINGS.md
# --------------------------------------------------------------------------
stats_path = OUT / "eda_stats.txt"
stats_path.write_text("\n".join(_notes), encoding="utf-8")
print(f"\n[written] {stats_path}")
print(f"[done] All figures in {OUT}")
