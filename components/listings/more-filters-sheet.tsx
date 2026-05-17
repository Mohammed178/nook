"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/nook/icon";
import type { ListingSearchParams } from "@/lib/listings-search";
import type { ListingType } from "@/lib/types";

interface MoreFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  initial: ListingSearchParams;
  onApply: (next: Partial<ListingSearchParams>) => void;
}

interface InnerProps {
  onClose: () => void;
  initial: ListingSearchParams;
  onApply: (next: Partial<ListingSearchParams>) => void;
}

const TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: "room", label: "Room" },
  { value: "studio", label: "Studio" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
];

const BEDS_OPTIONS = [
  { value: undefined, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
];

const AMENITY_OPTIONS = [
  { slug: "wifi", label: "WiFi" },
  { slug: "aircon", label: "Air conditioning" },
  { slug: "parking", label: "Parking" },
  { slug: "pool", label: "Pool" },
  { slug: "gym", label: "Gym" },
  { slug: "kitchen", label: "Private kitchen" },
  { slug: "shared-kitchen", label: "Shared kitchen" },
  { slug: "washer", label: "Washing machine" },
  { slug: "garden", label: "Garden" },
  { slug: "security", label: "24/7 security" },
];

export function MoreFiltersSheet({
  open,
  onClose,
  initial,
  onApply,
}: MoreFiltersSheetProps) {
  if (!open) return null;
  return <MoreFiltersSheetInner initial={initial} onClose={onClose} onApply={onApply} />;
}

function MoreFiltersSheetInner({ onClose, initial, onApply }: InnerProps) {
  const [priceMin, setPriceMin] = useState(initial.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initial.priceMax?.toString() ?? "");
  const [types, setTypes] = useState<Set<ListingType>>(new Set(initial.type ?? []));
  const [beds, setBeds] = useState<number | undefined>(initial.beds);
  const [furnished, setFurnished] = useState(initial.furnished ?? false);
  const [amenities, setAmenities] = useState<Set<string>>(
    new Set(initial.amenities ?? []),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function toggleType(t: ListingType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function toggleAmenity(slug: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const bedsDisabled = types.size === 1 && types.has("room");
  const bedsDisabledMsg = "Disabled when you search using only room filter";

  const minN = priceMin.trim() === "" ? undefined : Number(priceMin);
  const maxN = priceMax.trim() === "" ? undefined : Number(priceMax);
  const minInvalid = priceMin.trim() !== "" && (Number.isNaN(minN) || (minN as number) < 0);
  const maxInvalid = priceMax.trim() !== "" && (Number.isNaN(maxN) || (maxN as number) < 0);
  const rangeInvalid =
    minN != null &&
    maxN != null &&
    !Number.isNaN(minN) &&
    !Number.isNaN(maxN) &&
    minN > maxN;
  const priceInvalid = minInvalid || maxInvalid || rangeInvalid;
  const priceError = rangeInvalid
    ? "Minimum price cannot be larger than the maximum price"
    : minInvalid || maxInvalid
      ? "Enter a valid amount"
      : null;

  function apply() {
    if (priceInvalid) return;
    onApply({
      priceMin: minN,
      priceMax: maxN,
      type: types.size > 0 ? Array.from(types) : undefined,
      beds: bedsDisabled ? undefined : beds,
      furnished: furnished || undefined,
      amenities: amenities.size > 0 ? Array.from(amenities) : undefined,
    });
    onClose();
  }

  function reset() {
    setPriceMin("");
    setPriceMax("");
    setTypes(new Set());
    setBeds(undefined);
    setFurnished(false);
    setAmenities(new Set());
  }

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-head">
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>More filters</h2>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="sheet-section">
            <h3>Price (RM / month)</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                aria-invalid={minInvalid || rangeInvalid || undefined}
                style={{
                  flex: 1,
                  borderColor: minInvalid || rangeInvalid ? "var(--brand-500)" : undefined,
                }}
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                aria-invalid={maxInvalid || rangeInvalid || undefined}
                style={{
                  flex: 1,
                  borderColor: maxInvalid || rangeInvalid ? "var(--brand-500)" : undefined,
                }}
              />
            </div>
            {priceError && (
              <div
                role="alert"
                style={{
                  marginTop: 6,
                  fontSize: "var(--t-xs)",
                  color: "var(--brand-500)",
                }}
              >
                {priceError}
              </div>
            )}
          </div>

          <div className="sheet-section">
            <h3>Type</h3>
            <div className="checkbox-grid">
              {TYPE_OPTIONS.map((t) => (
                <label key={t.value} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={types.has(t.value)}
                    onChange={() => toggleType(t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div className="sheet-section">
            <h3>Bedrooms</h3>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                opacity: bedsDisabled ? 0.5 : 1,
              }}
            >
              {BEDS_OPTIONS.map((b) => (
                <button
                  key={String(b.value)}
                  type="button"
                  className={`filter-pill ${beds === b.value && !bedsDisabled ? "active" : ""}`}
                  onClick={() => setBeds(b.value)}
                  disabled={bedsDisabled}
                  aria-disabled={bedsDisabled}
                  title={bedsDisabled ? bedsDisabledMsg : undefined}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {bedsDisabled && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: "var(--t-xs)",
                  color: "var(--ink-700)",
                }}
              >
                {bedsDisabledMsg}
              </div>
            )}
          </div>

          <div className="sheet-section">
            <h3>Preferences</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={furnished}
                  onChange={(e) => setFurnished(e.target.checked)}
                />
                Furnished only
              </label>
            </div>
          </div>

          <div className="sheet-section">
            <h3>Must include</h3>
            <div className="checkbox-grid">
              {AMENITY_OPTIONS.map((a) => (
                <label key={a.slug} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={amenities.has(a.slug)}
                    onChange={() => toggleAmenity(a.slug)}
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn btn-secondary" onClick={reset}>
            Reset
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={apply}
            disabled={priceInvalid}
            aria-disabled={priceInvalid}
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
