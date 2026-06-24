import type { Listing, ListingType } from "@/lib/types";

// Pure price analytics for the "Fair Price" signal (features.md #1). No Supabase,
// no server-only: given an already-fetched listings array it derives where each
// listing sits in its local market. Compute-don't-claim (4c-B2): the band is
// computed at read from priceMonthly, never a stored or agent-entered tag.
//
// Honest-by-default: a thin cohort (< MIN_COHORT comparable rooms) earns no
// signal — buildPriceSignals omits it and the UI shows no badge rather than a
// weak claim. No FOMO, no fabricated urgency (brand rule).
//
// Cohort = live listings in the SAME area AND of the SAME type (decision:
// area+type). Comparing a single room to a whole house would be dishonest, so
// type is part of the cohort key.

function isLive(l: Listing): boolean {
  return l.status !== "draft" && !l.deletedAt;
}

// Smallest comparable cohort that earns a signal. Below this the distribution is
// too sparse to claim "good deal" / "above market" honestly.
export const MIN_COHORT = 5;

export type PriceBand = "good" | "around" | "above";

export interface PriceSignal {
  band: PriceBand;
  /** Listing's percentile rank (0–100) within its cohort, mid-rank on ties. */
  percentile: number;
  /** Cohort median monthly rent, RM (rounded). */
  median: number;
  /** Comparable live listings in the cohort (incl. this one). */
  n: number;
}

// Linear-interpolated quantile over an ascending, non-empty array.
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Share of the cohort priced at or below `value`, 0–100. Ties contribute their
// mid-rank so identical prices don't all read as "the cheapest".
function percentileRank(sorted: number[], value: number): number {
  let below = 0;
  let equal = 0;
  for (const p of sorted) {
    if (p < value) below++;
    else if (p === value) equal++;
  }
  return Math.round(((below + equal / 2) / sorted.length) * 100);
}

function cohortKey(areaId: string, type: ListingType): string {
  return `${areaId}|${type}`;
}

// One pass over every live listing: group by (area, type), then for each cohort
// big enough to count, assign every member its band + percentile against that
// cohort's distribution. Returns a Map keyed by listing id; listings whose
// cohort is too small are absent (caller treats absent as "no signal").
export function buildPriceSignals(
  allListings: Listing[],
): Map<string, PriceSignal> {
  const groups = new Map<string, Listing[]>();
  for (const l of allListings) {
    if (!isLive(l)) continue;
    const key = cohortKey(l.areaId, l.type);
    const bucket = groups.get(key);
    if (bucket) bucket.push(l);
    else groups.set(key, [l]);
  }

  const out = new Map<string, PriceSignal>();
  for (const cohort of groups.values()) {
    if (cohort.length < MIN_COHORT) continue;
    const prices = cohort.map((l) => l.priceMonthly).sort((a, b) => a - b);
    const p25 = quantile(prices, 0.25);
    const p75 = quantile(prices, 0.75);
    const median = Math.round(quantile(prices, 0.5));
    for (const l of cohort) {
      const band: PriceBand =
        l.priceMonthly < p25 ? "good" : l.priceMonthly > p75 ? "above" : "around";
      out.set(l.id, {
        band,
        percentile: percentileRank(prices, l.priceMonthly),
        median,
        n: cohort.length,
      });
    }
  }
  return out;
}
