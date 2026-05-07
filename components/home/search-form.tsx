"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Icon } from "@/components/nook/icon";
import { parseMoveInBy, parseWhere } from "@/lib/queries";
import { UNIVERSITIES } from "@/lib/seed/universities";
import {
  buildListingsHref,
  type ListingSearchParams,
} from "@/lib/listings-search";
import type { University } from "@/lib/types";

export type SearchFormVariant = "hero" | "popover";

interface SearchFormProps {
  variant?: SearchFormVariant;
  onSubmitNavigate?: () => void;
}

function filterUniversities(query: string): University[] {
  const q = query.trim().toLowerCase();
  if (!q) return UNIVERSITIES.slice();
  return UNIVERSITIES.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.shortName.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q),
  );
}

export function SearchForm({
  variant = "hero",
  onSubmitNavigate,
}: SearchFormProps) {
  const router = useRouter();
  const [where, setWhere] = useState("");
  const [pickedUniversityId, setPickedUniversityId] = useState<string | null>(
    null,
  );
  const [moveIn, setMoveIn] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showSuggest, setShowSuggest] = useState(false);
  const [rawHighlight, setHighlightIdx] = useState(0);
  const whereCellRef = useRef<HTMLDivElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => filterUniversities(where), [where]);
  const safeHighlight =
    suggestions.length === 0
      ? 0
      : Math.min(rawHighlight, suggestions.length - 1);

  useEffect(() => {
    if (!showSuggest) return;
    function onClick(e: MouseEvent) {
      if (!whereCellRef.current?.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [showSuggest]);

  function pickUniversity(u: University) {
    setWhere(u.name);
    setPickedUniversityId(u.id);
    setShowSuggest(false);
  }

  function onWhereKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggest || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      pickUniversity(suggestions[safeHighlight]);
    } else if (e.key === "Escape") {
      setShowSuggest(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const min = minPrice.trim() === "" ? undefined : Number(minPrice);
    const max = maxPrice.trim() === "" ? undefined : Number(maxPrice);

    if (min != null && max != null && min > max) {
      setError("Min price must be less than or equal to Max price.");
      return;
    }
    setError(null);

    const next: ListingSearchParams = {};

    if (pickedUniversityId) {
      next.university = pickedUniversityId;
    } else if (where.trim()) {
      const parsed = parseWhere(where);
      if (parsed.universityId) next.university = parsed.universityId;
      else if (parsed.areaId) next.area = parsed.areaId;
      else if (parsed.q) next.q = parsed.q;
    }
    if (moveIn.trim()) {
      const iso = parseMoveInBy(moveIn);
      if (iso) next.moveInBy = iso;
    }
    if (min != null) next.priceMin = min;
    if (max != null) next.priceMax = max;

    onSubmitNavigate?.();
    router.push(buildListingsHref(next));
  }

  const isPopover = variant === "popover";

  return (
    <>
      <form
        className={isPopover ? "search-panel search-panel-popover" : "search-panel"}
        onSubmit={onSubmit}
        noValidate
      >
        <div className="sp-cell sp-cell-where" ref={whereCellRef}>
          <span className="sp-lab">University or area</span>
          <div className="sp-where-row">
            <input
              ref={whereInputRef}
              className="sp-input"
              placeholder="UM, UKM, Bangsar…"
              value={where}
              onChange={(e) => {
                setWhere(e.target.value);
                setPickedUniversityId(null);
                setShowSuggest(true);
                setHighlightIdx(0);
              }}
              onFocus={() => setShowSuggest(true)}
              onKeyDown={onWhereKeyDown}
              role="combobox"
              aria-expanded={showSuggest && suggestions.length > 0}
              aria-controls="sp-suggest-list"
              aria-autocomplete="list"
              autoComplete="off"
            />
            <button
              type="button"
              className="sp-where-toggle"
              aria-label={showSuggest ? "Close university list" : "Open university list"}
              aria-expanded={showSuggest}
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                setShowSuggest((v) => !v);
                whereInputRef.current?.focus();
              }}
            >
              <Icon name="chevron-down" size={14} strokeWidth={2.4} />
            </button>
          </div>
          {showSuggest && suggestions.length > 0 && (
            <ul
              id="sp-suggest-list"
              role="listbox"
              className="sp-suggest"
            >
              {suggestions.map((u, i) => (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={i === safeHighlight}
                  className={`sp-suggest-item${i === safeHighlight ? " is-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickUniversity(u);
                  }}
                  onMouseEnter={() => setHighlightIdx(i)}
                >
                  <span className="sp-suggest-name">{u.name}</span>
                  <span className="sp-suggest-meta">
                    {u.shortName} · {u.city}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sp-cell">
          <span className="sp-lab">Move-in</span>
          <input
            className="sp-input"
            placeholder="Anytime"
            value={moveIn}
            onChange={(e) => setMoveIn(e.target.value)}
          />
        </div>
        <div className="sp-cell">
          <span className="sp-lab">Min RM</span>
          <input
            className="sp-input"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="300"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <div className="sp-cell">
          <span className="sp-lab">Max RM</span>
          <input
            className="sp-input"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="800"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <div className="sp-cta">
          <button type="submit" title="Search" aria-label="Search">
            <Icon name="search" size={22} strokeWidth={2.2} />
          </button>
        </div>
      </form>

      {error && (
        <div className="search-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
