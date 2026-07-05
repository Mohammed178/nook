// Read boundary for the committed rent-forecast snapshot
// (`lib/seed/rent-forecast.json`). The snapshot is produced offline by the
// 3-month forecast model — see `Prediction Model/rent-forecast/scripts/
// export_area_forecast.py` and [[nook-rent-forecast-model]].
//
// The snapshot stores ONLY percentage changes per horizon. The panel behind the
// model is synthetic, so its absolute rents are the wrong scale for Nook's real
// student rooms; the UI rebases these percentages onto each area's real median
// listing price (see `projectRent`). Areas with no panel proxy are simply absent
// from the snapshot, and `getAreaForecast` returns null for them.

import snapshot from "@/lib/seed/rent-forecast.json";

export interface AreaForecast {
  /** Panel area(s) this forecast was aggregated from (e.g. "Bangsar"). */
  match: string;
  level: "district" | "city";
  /** Facilities in the panel aggregate — a rough confidence signal. */
  n: number;
  /** Median % change vs current at t+1 / t+2 / t+3 months. */
  pctH1: number;
  pctH2: number;
  pctH3: number;
}

export interface ForecastSnapshot {
  generatedAt: string;
  modelVersion: string;
  /** Latest observed month the forecast is anchored to, e.g. "2025-12". */
  asOf: string;
  testR2: { h1: number; h2: number; h3: number };
  areas: Record<string, AreaForecast>;
}

const SNAPSHOT = snapshot as ForecastSnapshot;

/** The forecast for an area slug, or null when the area has no panel proxy. */
export function getAreaForecast(slug: string): AreaForecast | null {
  return SNAPSHOT.areas[slug] ?? null;
}

/** Model test R² per horizon + provenance, for honest labelling in the UI. */
export function getForecastMeta() {
  const { asOf, modelVersion, testR2, generatedAt } = SNAPSHOT;
  return { asOf, modelVersion, testR2, generatedAt };
}

/** Apply a forecast percentage to a real base rent, rounded to whole RM. */
export function projectRent(baseRent: number, pct: number): number {
  return Math.round(baseRent * (1 + pct / 100));
}
