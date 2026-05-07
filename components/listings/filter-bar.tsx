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

interface FilterBarProps {
  params: ListingSearchParams;
  resultCount: number;
  locationLabel: string;
  effectiveSort: SortKey;
}

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

function budgetLabel(p: ListingSearchParams): string {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return "Any price";
  if (priceMin != null && priceMax != null) return `RM ${priceMin} – ${priceMax}`;
  if (priceMax != null) return `Up to RM ${priceMax}`;
  return `From RM ${priceMin}`;
}

function bedsLabel(p: ListingSearchParams): string {
  if (p.beds == null) return "Any beds";
  return `${p.beds}+ bed`;
}

function typeLabel(p: ListingSearchParams): string {
  if (!p.type || p.type.length === 0) return "Any type";
  if (p.type.length === 1) return TYPE_LABELS[p.type[0]] ?? p.type[0];
  return `${p.type.length} types`;
}

export function FilterBar({
  params,
  resultCount,
  locationLabel,
  effectiveSort,
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

  function toggleFurnished() {
    applyPartial({ furnished: params.furnished ? undefined : true });
  }
  function toggleFemale() {
    applyPartial({ female: params.female ? undefined : true });
  }
  function onSortChange(e: ChangeEvent<HTMLSelectElement>) {
    applyPartial({ sort: e.target.value as SortKey });
  }

  const bedsDisabled =
    !!params.type && params.type.length === 1 && params.type[0] === "room";
  const bedsDisabledMsg = "Disabled when you search using only room filter";

  return (
    <>
      <div className="filterbar">
        <div className="filterbar-inner">
          <button type="button" className="filter-pill" aria-label="Location">
            <Icon name="pin" size={13} />
            {locationLabel}
          </button>
          <button
            type="button"
            className={`filter-pill ${params.type && params.type.length > 0 ? "active" : ""}`}
            onClick={() => setSheetOpen(true)}
          >
            {typeLabel(params)}
            <Icon name="chevron-down" size={12} className="caret" />
          </button>
          <PricePopover
            initialMin={params.priceMin}
            initialMax={params.priceMax}
            label={budgetLabel(params)}
            onApply={(patch) => applyPartial(patch)}
          />
          <button
            type="button"
            className={`filter-pill ${params.beds != null ? "active" : ""}`}
            onClick={() => setSheetOpen(true)}
            disabled={bedsDisabled}
            aria-disabled={bedsDisabled}
            title={bedsDisabled ? bedsDisabledMsg : undefined}
          >
            {bedsLabel(params)}
            <Icon name="chevron-down" size={12} className="caret" />
          </button>
          <button
            type="button"
            className={`filter-pill ${params.furnished ? "active" : ""}`}
            onClick={toggleFurnished}
          >
            Furnished
          </button>
          <button
            type="button"
            className={`filter-pill ${params.female ? "active" : ""}`}
            onClick={toggleFemale}
          >
            Female only
          </button>
          <button
            type="button"
            className={`filter-pill ${params.amenities && params.amenities.length > 0 ? "active" : ""}`}
            onClick={() => setSheetOpen(true)}
          >
            <Icon name="sliders" size={13} />
            More filters
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: "var(--t-sm)", color: "var(--ink-700)" }}>
            <strong>{resultCount}</strong> {resultCount === 1 ? "room" : "rooms"}
          </span>

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

      <MoreFiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={params}
        onApply={(patch) => applyPartial(patch)}
      />
    </>
  );
}
