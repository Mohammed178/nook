"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/nook/icon";
import { useDict } from "@/lib/i18n/context";

interface PricePopoverProps {
  initialMin?: number;
  initialMax?: number;
  label: string;
  onApply: (next: { priceMin?: number; priceMax?: number }) => void;
}

interface PanelProps {
  initialMin?: number;
  initialMax?: number;
  onApply: (next: { priceMin?: number; priceMax?: number }) => void;
  onClose: () => void;
}

export function PricePopover({
  initialMin,
  initialMax,
  label,
  onApply,
}: PricePopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = initialMin != null || initialMax != null;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        className={`filter-pill ${active ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <Icon name="chevron-down" size={12} className="caret" />
      </button>
      {open && (
        <PricePanel
          initialMin={initialMin}
          initialMax={initialMax}
          onApply={onApply}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PricePanel({ initialMin, initialMax, onApply, onClose }: PanelProps) {
  const dict = useDict();
  const l = dict.listings;
  const [min, setMin] = useState(initialMin?.toString() ?? "");
  const [max, setMax] = useState(initialMax?.toString() ?? "");

  const minN = min.trim() === "" ? undefined : Number(min);
  const maxN = max.trim() === "" ? undefined : Number(max);
  const minInvalid = min.trim() !== "" && (Number.isNaN(minN) || (minN as number) < 0);
  const maxInvalid = max.trim() !== "" && (Number.isNaN(maxN) || (maxN as number) < 0);
  const rangeInvalid = minN != null && maxN != null && !Number.isNaN(minN) && !Number.isNaN(maxN) && minN > maxN;
  const invalid = minInvalid || maxInvalid || rangeInvalid;
  const error = rangeInvalid
    ? l.priceRangeError
    : minInvalid || maxInvalid
      ? l.enterValidAmount
      : null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (invalid) return;
    onApply({ priceMin: minN, priceMax: maxN });
    onClose();
  }

  function clear() {
    setMin("");
    setMax("");
    onApply({ priceMin: undefined, priceMax: undefined });
    onClose();
  }

  return (
    <form
      className="popover"
      style={{ top: "calc(100% + 6px)", left: 0 }}
      onSubmit={submit}
    >
          <div className="popover-row">
            <label style={{ fontSize: "var(--t-xs)", color: "var(--ink-700)", flex: 1 }}>
              {l.minRM}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input force-ltr"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                aria-invalid={minInvalid || rangeInvalid || undefined}
                style={{
                  width: "100%",
                  marginTop: 4,
                  borderColor: minInvalid || rangeInvalid ? "var(--brand-500)" : undefined,
                }}
              />
            </label>
            <label style={{ fontSize: "var(--t-xs)", color: "var(--ink-700)", flex: 1 }}>
              {l.maxRM}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input force-ltr"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                aria-invalid={maxInvalid || rangeInvalid || undefined}
                style={{
                  width: "100%",
                  marginTop: 4,
                  borderColor: maxInvalid || rangeInvalid ? "var(--brand-500)" : undefined,
                }}
              />
            </label>
          </div>
          {error && (
            <div style={{ fontSize: "var(--t-xs)", color: "var(--brand-500)" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={clear}
            >
              {dict.common.clear}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={invalid}
              aria-disabled={invalid}
            >
              {dict.common.apply}
            </button>
          </div>
    </form>
  );
}
