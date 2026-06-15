"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { Icon } from "@/components/nook/icon";
import {
  buildListingsHref,
  type ListingSearchParams,
  type SortKey,
} from "@/lib/listings-search";
import { PricePopover } from "./price-popover";
import { MoreFiltersSheet } from "./more-filters-sheet";
import { SaveSearchButton } from "./save-search-button";
import { SearchForm } from "@/components/home/search-form";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { formatPrice } from "@/lib/utils";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Area, Gender } from "@/lib/types";
import type { AreaLookup } from "@/lib/saved-search-summary";

type ListingsDict = Dictionary["listings"];

interface FilterBarProps {
  params: ListingSearchParams;
  resultCount: number;
  locationLabel: string;
  effectiveSort: SortKey;
  signedIn: boolean;
  viewerGender?: Gender;
  areaLookup: AreaLookup;
  areas: Area[];
}

function genderChipLabel(l: ListingsDict, g: Gender): string {
  return g === "female"
    ? l.femaleOnlyRooms
    : g === "male"
      ? l.maleOnlyRooms
      : l.mixedRooms;
}

function sortOptions(l: ListingsDict): { value: SortKey; label: string }[] {
  return [
    { value: "priceAsc", label: l.sortPriceAsc },
    { value: "priceDesc", label: l.sortPriceDesc },
    { value: "distance", label: l.sortDistance },
    { value: "newest", label: l.sortNewest },
  ];
}

function budgetLabel(p: ListingSearchParams, l: ListingsDict): string {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return l.anyPrice;
  if (priceMin != null && priceMax != null)
    return format(l.priceRange, { min: priceMin, max: priceMax });
  if (priceMax != null) return format(l.upToPrice, { max: priceMax });
  return format(l.fromPriceLong, { min: priceMin! });
}

interface AppliedChip {
  key: string;
  label: string;
  clear: Partial<ListingSearchParams>;
}

function appliedChips(p: ListingSearchParams, l: ListingsDict): AppliedChip[] {
  const chips: AppliedChip[] = [];

  if (p.q) {
    chips.push({
      key: "q",
      label: format(l.keywordFilter, { q: p.q }),
      clear: { q: undefined },
    });
  }

  if (p.priceMin != null || p.priceMax != null) {
    let label: string;
    if (p.priceMin != null && p.priceMax != null) {
      label = format(l.priceRangeShort, {
        min: formatPrice(p.priceMin),
        max: formatPrice(p.priceMax),
      });
    } else if (p.priceMax != null) {
      label = format(l.underPrice, { price: formatPrice(p.priceMax) });
    } else {
      label = format(l.fromPriceShort, { price: formatPrice(p.priceMin!) });
    }
    chips.push({
      key: "price",
      label,
      clear: { priceMin: undefined, priceMax: undefined },
    });
  }

  if (p.type && p.type.length > 0) {
    if (p.type.length === 1) {
      const slug = p.type[0];
      chips.push({
        key: "type",
        label: l.types[slug as keyof typeof l.types] ?? slug,
        clear: { type: undefined },
      });
    } else {
      chips.push({
        key: "type",
        label: format(l.typesCount, { n: p.type.length }),
        clear: { type: undefined },
      });
    }
  }

  if (p.beds != null) {
    chips.push({
      key: "beds",
      label: format(l.bedsPlus, { n: p.beds }),
      clear: { beds: undefined },
    });
  }

  if (p.furnished) {
    chips.push({
      key: "furnished",
      label: l.furnished,
      clear: { furnished: undefined },
    });
  }

  if (p.amenities && p.amenities.length > 0) {
    for (const slug of p.amenities) {
      chips.push({
        key: `amenity-${slug}`,
        label: l.amenityFilter[slug as keyof typeof l.amenityFilter] ?? slug,
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
  areas,
}: FilterBarProps) {
  const l = useDict().listings;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const locWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!locOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLocOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!locWrapRef.current?.contains(e.target as Node)) setLocOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [locOpen]);

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
  const chips = appliedChips(params, l);
  const genderDismissed = params.genderOverride === "off";
  const showGenderChip = viewerGender !== undefined;
  const genderLabel = showGenderChip ? genderChipLabel(l, viewerGender!) : null;

  return (
    <>
      <div className="filterbar">
        <div className="filterbar-inner">
          <div className="filter-loc-wrap" ref={locWrapRef}>
            <button
              type="button"
              className={`filter-pill ${locOpen ? "active" : ""}`}
              onClick={() => setLocOpen((v) => !v)}
              aria-expanded={locOpen}
              aria-haspopup="dialog"
              aria-label={l.changeLocation}
            >
              <Icon name="pin" size={13} />
              {locationLabel}
              <Icon name="chevron-down" size={12} />
            </button>
            {locOpen ? (
              <div
                className="popover filter-loc-popover"
                role="dialog"
                aria-label={l.changeLocation}
              >
                <SearchForm
                  variant="popover"
                  areas={areas}
                  universities={UNIVERSITIES}
                  baseParams={params}
                  onSubmitNavigate={() => setLocOpen(false)}
                />
              </div>
            ) : null}
          </div>
          <PricePopover
            initialMin={params.priceMin}
            initialMax={params.priceMax}
            label={budgetLabel(params, l)}
            onApply={(patch) => applyPartial(patch)}
          />
          <button
            type="button"
            className={`filter-pill ${advancedCount > 0 ? "active" : ""}`}
            onClick={() => setSheetOpen(true)}
            aria-label={
              advancedCount > 0
                ? format(l.filtersActive, { n: advancedCount })
                : l.filters
            }
          >
            <Icon name="sliders" size={13} />
            {l.filters}
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
            aria-label={l.sort}
          >
            {sortOptions(l).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <SaveSearchButton query={params} signedIn={signedIn} areaLookup={areaLookup} />

          <div className="view-toggle">
            <button type="button" className="active" aria-label={l.listView}>
              <Icon name="list" size={14} /> {l.list}
            </button>
            <button type="button" aria-label={l.mapView} disabled>
              <Icon name="map" size={14} /> {l.map}
            </button>
          </div>
        </div>
      </div>

      {showGenderChip || chips.length > 0 ? (
        <div className="applied-filters" role="region" aria-label={l.appliedFilters}>
          <div className="applied-filters-inner">
            {showGenderChip && !genderDismissed ? (
              <button
                type="button"
                className="applied-chip applied-chip-auto"
                onClick={() => applyPartial({ genderOverride: "off" })}
                title={l.genderFromProfileTitle}
                aria-label={format(l.genderFromProfileAria, { label: genderLabel ?? "" })}
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
                title={l.showingAllGendersTitle}
                aria-label={l.showingAllGendersAria}
              >
                {l.showingAllGenders}
              </button>
            ) : null}
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className="applied-chip"
                onClick={() => applyPartial(c.clear)}
                aria-label={format(l.removeFilter, { label: c.label })}
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
                    q: undefined,
                    priceMin: undefined,
                    priceMax: undefined,
                    type: undefined,
                    beds: undefined,
                    furnished: undefined,
                    amenities: undefined,
                  })
                }
              >
                {l.clearAll}
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
