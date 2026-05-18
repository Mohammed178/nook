"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";
import { Icon } from "@/components/nook/icon";
import {
  buildListingsHref,
  type ListingSearchParams,
  type SortKey,
} from "@/lib/listings-search";
import { PricePopover } from "./price-popover";
import { MoreFiltersSheet } from "./more-filters-sheet";
import { SaveSearchButton } from "./save-search-button";
import { formatPrice } from "@/lib/utils";
import type { Gender } from "@/lib/types";
import type { AreaLookup } from "@/lib/saved-search-summary";

interface FilterBarProps {
  params: ListingSearchParams;
  resultCount: number;
  locationLabel: string;
  effectiveSort: SortKey;
  signedIn: boolean;
  viewerGender?: Gender;
  areaLookup: AreaLookup;
}

const GENDER_CHIP_LABEL: Record<Gender, string> = {
  female: "Female-only rooms",
  male: "Male-only rooms",
  mixed: "Mixed-gender rooms",
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "distance", label: "Distance to campus" },
  { value: "newest", label: "Newest first" },
];

const TYPE_LABELS: Record<string, string> = {
  room: "Room",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  aircon: "Air conditioning",
  parking: "Parking",
  pool: "Pool",
  gym: "Gym",
  kitchen: "Private kitchen",
  "shared-kitchen": "Shared kitchen",
  washer: "Washing machine",
  garden: "Garden",
  security: "24/7 security",
};

function budgetLabel(p: ListingSearchParams): string {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return "Any price";
  if (priceMin != null && priceMax != null) return `RM ${priceMin} – ${priceMax}`;
  if (priceMax != null) return `Up to RM ${priceMax}`;
  return `From RM ${priceMin}`;
}

interface AppliedChip {
  key: string;
  label: string;
  clear: Partial<ListingSearchParams>;
}

function appliedChips(p: ListingSearchParams): AppliedChip[] {
  const chips: AppliedChip[] = [];

  if (p.priceMin != null || p.priceMax != null) {
    let label: string;
    if (p.priceMin != null && p.priceMax != null) {
      label = `${formatPrice(p.priceMin)}–${formatPrice(p.priceMax)}`;
    } else if (p.priceMax != null) {
      label = `Under ${formatPrice(p.priceMax)}`;
    } else {
      label = `From ${formatPrice(p.priceMin!)}`;
    }
    chips.push({
      key: "price",
      label,
      clear: { priceMin: undefined, priceMax: undefined },
    });
  }

  if (p.type && p.type.length > 0) {
    if (p.type.length === 1) {
      chips.push({
        key: "type",
        label: TYPE_LABELS[p.type[0]] ?? p.type[0],
        clear: { type: undefined },
      });
    } else {
      chips.push({
        key: "type",
        label: `${p.type.length} types`,
        clear: { type: undefined },
      });
    }
  }

  if (p.beds != null) {
    chips.push({
      key: "beds",
      label: `${p.beds}+ bed`,
      clear: { beds: undefined },
    });
  }

  if (p.furnished) {
    chips.push({
      key: "furnished",
      label: "Furnished",
      clear: { furnished: undefined },
    });
  }

  if (p.amenities && p.amenities.length > 0) {
    for (const slug of p.amenities) {
      chips.push({
        key: `amenity-${slug}`,
        label: AMENITY_LABELS[slug] ?? slug,
        clear: {
          amenities: p.amenities.filter((a) => a !== slug),
        },
      });
    }
  }

  return chips;
}

function advancedFilterCount(p: ListingSearchParams): number {
  let n = 0;
  if (p.type && p.type.length > 0) n++;
  if (p.beds != null) n++;
  if (p.furnished) n++;
  if (p.amenities && p.amenities.length > 0) n += p.amenities.length;
  return n;
}

export function FilterBar({
  params,
  resultCount: _resultCount,
  locationLabel,
  effectiveSort,
  signedIn,
  viewerGender,
  areaLookup,
}: FilterBarProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  function pushNext(next: ListingSearchParams) {
    startTransition(() => {
      router.push(buildListingsHref(next));
    });
  }

  function applyPartial(patch: Partial<ListingSearchParams>) {
    pushNext({ ...params, ...patch });
  }

  function onSortChange(e: ChangeEvent<HTMLSelectElement>) {
    applyPartial({ sort: e.target.value as SortKey });
  }

  const advancedCount = advancedFilterCount(params);
  const chips = appliedChips(params);
  const genderDismissed = params.genderOverride === "off";
  const showGenderChip = viewerGender !== undefined;
  const genderLabel = showGenderChip
    ? GENDER_CHIP_LABEL[viewerGender!]
    : null;

  return (
    <>
      <div className="filterbar">
        <div className="filterbar-inner">
          <button type="button" className="filter-pill" aria-label="Location">
            <Icon name="pin" size={13} />
            {locationLabel}
          </button>
          <PricePopover
            initialMin={params.priceMin}
            initialMax={params.priceMax}
            label={budgetLabel(params)}
            onApply={(patch) => applyPartial(patch)}
          />
          <button
            type="button"
            className={`filter-pill ${advancedCount > 0 ? "active" : ""}`}
            onClick={() => setSheetOpen(true)}
            aria-label={
              advancedCount > 0
                ? `Filters, ${advancedCount} active`
                : "Filters"
            }
          >
            <Icon name="sliders" size={13} />
            Filters
            {advancedCount > 0 ? (
              <span className="filter-pill-badge" aria-hidden="true">
                {advancedCount}
              </span>
            ) : null}
          </button>

          <div style={{ flex: 1 }} />

          <select
            className="sort-select"
            value={effectiveSort}
            onChange={onSortChange}
            aria-label="Sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <SaveSearchButton query={params} signedIn={signedIn} areaLookup={areaLookup} />

          <div className="view-toggle">
            <button type="button" className="active" aria-label="List view">
              <Icon name="list" size={14} /> List
            </button>
            <button type="button" aria-label="Map view" disabled>
              <Icon name="map" size={14} /> Map
            </button>
          </div>
        </div>
      </div>

      {showGenderChip || chips.length > 0 ? (
        <div className="applied-filters" role="region" aria-label="Applied filters">
          <div className="applied-filters-inner">
            {showGenderChip && !genderDismissed ? (
              <button
                type="button"
                className="applied-chip applied-chip-auto"
                onClick={() => applyPartial({ genderOverride: "off" })}
                title="Applied from your profile. Tap × to see all genders."
                aria-label={`${genderLabel}, applied from your profile. Click to dismiss.`}
              >
                <Icon name="lock" size={11} />
                {genderLabel}
                <Icon name="x" size={12} />
              </button>
            ) : null}
            {showGenderChip && genderDismissed ? (
              <button
                type="button"
                className="applied-chip applied-chip-muted"
                onClick={() => applyPartial({ genderOverride: undefined })}
                title="Re-apply your profile gender preference."
                aria-label="Showing all genders. Click to re-apply your profile preference."
              >
                Showing all genders, re-apply
              </button>
            ) : null}
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className="applied-chip"
                onClick={() => applyPartial(c.clear)}
                aria-label={`Remove ${c.label} filter`}
              >
                {c.label}
                <Icon name="x" size={12} />
              </button>
            ))}
            {chips.length > 0 ? (
              <button
                type="button"
                className="applied-clear"
                onClick={() =>
                  applyPartial({
                    priceMin: undefined,
                    priceMax: undefined,
                    type: undefined,
                    beds: undefined,
                    furnished: undefined,
                    amenities: undefined,
                  })
                }
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <MoreFiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={params}
        onApply={(patch) => applyPartial(patch)}
      />
    </>
  );
}
