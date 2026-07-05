# EDA Findings — Malaysia Rental Panel

Phase 1 exploratory analysis for the 3-month rental price prediction project.
Source: `data/malaysia_rental_panel.csv`. Analysis script: `notebooks/01_eda.py`
(mirrored in `notebooks/01_eda.ipynb`). All figures referenced below are in
`reports/eda/` at 150 dpi; raw numbers are in `reports/eda/eda_stats.txt`.

---

## Dataset at a glance

| Property | Value |
|---|---|
| Rows parsed | 17,050 (1 corrupt, dropped) → **17,049 clean** |
| Facilities | 203 |
| Columns | 43 |
| Date span | 2019-01 → 2025-12 (monthly panel, ~84 months) |
| States | 10 |
| Districts | 28 |
| Property types | Apartment, Condominium, SOHO, Serviced Apartment |
| Furnished levels | Fully Furnished, Partial, Unfurnished |

Note the panel is materially smaller than the plan's stated 43,680 rows / 520
facilities. The actual file is **17,049 rows / 203 facilities**. Splits,
baselines and per-state error breakdowns should be sized against the real
counts (e.g. Perak has only 4 facilities).

---

## Key findings

1. **Rent is strongly right-skewed** (skew = 2.65). Median RM 1,930, mean
   RM 2,685, max RM 19,370. The 95th percentile (RM 8,326) is ~4× the median,
   driven by luxury KL/Penang units. Model on/report a log scale; keep MAE
   alongside MAPE as the plan warns. See `01_rent_distribution_overall.png`.

2. **Rent is highly location-stratified.** Median rent by state ranges from
   **KL RM 3,150** and Penang RM 2,440 down to Perak RM 1,030 — a 3× spread.
   `state`/`district` will carry real signal. See `02_rent_by_state.png`,
   `06_rent_by_district.png`.

3. **Facility coverage is concentrated.** Selangor (70) and KL (54) hold 61% of
   all facilities; Perak (4), Putrajaya (6) and Negeri Sembilan (6) are thin.
   Per-state test metrics for the small states will be noisy.
   See `03_facilities_per_state.png`.

4. **COVID dip is present but mild.** Overall median rent troughs at
   **RM 1,830 in Dec 2020, about −7.1%** vs the pre-COVID peak (RM 1,970),
   then recovers and rises through 2025 (yearly medians: 2019 RM 1,880 →
   2023 RM 1,950 → 2025 RM 2,120). Visible and annotatable, not dramatic.
   See `04_rent_trend_overall.png`, `05_rent_trend_by_state.png`.

5. **The lag features are near-collinear — the plan's two-model design is
   justified.** All pairwise correlations among `current_rent_rm`,
   `previous_month_rent`, `previous_3m_average`, `previous_6m_average` exceed
   0.95 (0.965 up to **0.993** for 3m↔6m). Each also correlates ~0.965 with the
   target. Interpreting Model A's coefficients directly would be unsafe; the
   reduced OLS (Model B) is the right call. See `11_lag_feature_collinearity.png`.

6. **Non-lag drivers behave as expected.** After the lags, the strongest
   positive correlate of rent is `average_income_area` (r = +0.82), then
   `maintenance_fee_rm` (+0.69), `floor_area_sqft` (+0.54), `bedrooms` (+0.42).
   Negatives: `crime_index` (−0.36), `distance_to_city_center_km` (−0.34),
   `distance_to_lrt_km` (−0.25). Signs all match plan section 4.
   Condominium > Serviced Apartment > Apartment > SOHO by median rent.
   See `07`, `08`, `09`, `10`.

7. **Missing values match the plan almost exactly.** Exactly the five columns
   the plan names carry NaNs: `hospital_distance_km` 0.30%, `school_rating`
   0.28%, `occupancy_rate` 0.26%, `crime_index` 0.23%, `shopping_mall_distance_km`
   0.21%. Their union is **218 rows = 1.28%**, confirming the plan's "~1.3%".
   Median imputation inside the pipeline is adequate. See `12_missing_values.png`.

8. **Seasonality partially confirms the plan.** Mean month-over-month rent
   growth peaks in **January (+3.5%)**, then **September (+2.3%)** and August
   (+2.2%). October is only +1.7% and November is the sole negative month
   (−0.09%). So the plan's "Jan peak" is strongly supported and "Sep" holds, but
   "Oct" is not a peak — the second bump is Aug–Sep. sin/cos month encoding is
   still appropriate. See `13_seasonality_growth.png`.

9. **Macro overlay.** Over time, median rent tracks `cpi_index` (r = +0.78) and
   `opr_rate` (+0.51), moves inversely to `unemployment_rate` (−0.48), and is
   essentially uncorrelated with the monthly `inflation_rate` (−0.07). CPI is
   the useful macro level; raw inflation adds little on its own.
   See `15_macro_overlay.png`.

10. **Panel is clean and internally consistent.** 202/203 facilities have
    exactly 84 monthly rows; **no duplicate facility-month rows and no gaps** in
    any monthly sequence. Critically, the identity
    `next_month_rent_rm(t) == current_rent_rm(t+1)` holds for **all 16,846
    consecutive pairs (0 violations)** — the M1 target column is trustworthy and
    the t+2 / t+3 shift-based targets can be built with confidence.
    See `16_rows_per_facility.png`.

---

## Data quality problems that affect modeling

- **One corrupt/truncated row.** The CSV has no trailing newline and its final
  record (`FAC000203 @ 2025-10-01`) is cut off mid-line: `cpi_index` is
  misaligned to `1.0` and every column from `average_income_area` onward —
  including the target — is NaN. The EDA script drops rows with a NaN target
  (17,050 → 17,049). **The feature builder in `src/` must do the same** (e.g.
  `dropna(subset=['current_rent_rm'])`) or this junk row will poison training.

- **One short facility.** `FAC000203` has 81 clean rows instead of 84 (its
  history ends earlier; the dropped corrupt row was its 2025-10 entry). Not a
  gap — the sequence is contiguous — but it yields slightly fewer t+2/t+3
  training rows for that facility. No action needed beyond the standard
  end-of-history shift drops.

- **Heavy right tail, not bad data.** 11.3% of rows sit beyond the 1.5×IQR
  fence (upper bound RM 4,835), but these are genuine high-end KL/Penang units,
  not errors (min rent RM 570, no non-positive or zero rents). Do **not** clip
  them. It does mean MAPE will be unstable on cheap units — report MAE/RMSE
  alongside, exactly as the plan states.

- **Lag collinearity (>0.95).** Fine for the accuracy model, fatal for
  coefficient interpretation. Confirmed empirically; handle via the reduced
  Model B (keep `current_rent_rm`, drop the other three lags) and check VIF.

- **Scale mismatch vs plan.** 203 facilities, not 520. The temporal split
  (train ≤2023 / val 2024 / test 2025) still works, but small states will have
  few test facilities — interpret per-state 2025 metrics cautiously.

---

## Generated files

Script / notebook:

- `notebooks/01_eda.py` — commented end-to-end analysis script
- `notebooks/01_eda.ipynb` — same analysis as a 24-cell nbformat notebook
  (code + markdown narration)

Report assets in `reports/eda/`:

- `EDA_FINDINGS.md` — this document
- `eda_stats.txt` — full numeric dump backing every figure
- `01_rent_distribution_overall.png` — rent histogram, linear + log10
- `02_rent_by_state.png` — rent by state (log scale)
- `03_facilities_per_state.png` — facility count per state
- `04_rent_trend_overall.png` — median rent by month + COVID annotation
- `05_rent_trend_by_state.png` — median rent by month, top states
- `06_rent_by_district.png` — rent by top-15 districts
- `07_rent_vs_floor_area.png` — rent vs floor area (r = 0.54)
- `08_rent_by_property_attributes.png` — rent by bedrooms / furnished / type
- `09_correlation_heatmap_full.png` — full numeric correlation heatmap
- `10_corr_with_target.png` — features ranked by correlation with rent
- `11_lag_feature_collinearity.png` — the >0.95 lag-feature block
- `12_missing_values.png` — missing-value audit
- `13_seasonality_growth.png` — mean MoM rent growth by calendar month
- `14_rent_growth_last_year_by_month.png` — dataset YoY-growth column by month
- `15_macro_overlay.png` — median rent vs inflation / OPR over time
- `16_rows_per_facility.png` — rows-per-facility distribution (≈84)
