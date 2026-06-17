"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Icon } from "@/components/nook/icon";

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  /** First row, selecting it clears the filter (value ""). */
  allLabel: string;
  noMatchesLabel: string;
  clearLabel: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

// A type-to-filter combobox mirroring the home search bar's where-field
// (input[role=combobox] + listbox of options, arrow/enter/escape nav,
// click-outside close). Used for the agent-directory filters so the user can
// search and select rather than scroll a long native <select>.
export function SearchableSelect({
  label,
  placeholder,
  allLabel,
  noMatchesLabel,
  clearLabel,
  options,
  value,
  onChange,
}: SearchableSelectProps) {
  const listId = useId();
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reflect external selection changes (clear button, navigation) in the input,
  // adjusting derived state during render rather than in an effect.
  const [prevSelected, setPrevSelected] = useState(selectedLabel);
  if (prevSelected !== selectedLabel) {
    setPrevSelected(selectedLabel);
    setQuery(selectedLabel);
  }

  const q = query.trim().toLowerCase();
  // When the input still shows the current selection, list everything; once the
  // user edits, narrow by name or meta (e.g. campus short name / city).
  const matches = useMemo(() => {
    if (!q || q === selectedLabel.toLowerCase()) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.meta ?? "").toLowerCase().includes(q),
    );
  }, [options, q, selectedLabel]);

  // Row 0 is always the "all" reset; option rows follow.
  const rows: SelectOption[] = [{ value: "", label: allLabel }, ...matches];
  const safeHighlight = Math.min(highlight, rows.length - 1);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!cellRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    }
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, [open, selectedLabel]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(rows[safeHighlight].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery(selectedLabel);
    }
  }

  return (
    <div className="agents-cb" ref={cellRef}>
      <span className="agents-cb-lab">{label}</span>
      <div className="agents-cb-row">
        <input
          ref={inputRef}
          className="agents-cb-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            className="agents-cb-clear"
            aria-label={clearLabel}
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setQuery("");
              setOpen(false);
            }}
          >
            <Icon name="x" size={14} strokeWidth={2.4} />
          </button>
        ) : (
          <button
            type="button"
            className="agents-cb-toggle"
            aria-label={label}
            aria-expanded={open}
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
              inputRef.current?.focus();
            }}
          >
            <Icon name="chevron-down" size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {open && (
        <ul id={listId} role="listbox" className="agents-cb-list">
          {rows.map((o, i) => (
            <li
              key={`${o.value}-${i}`}
              role="option"
              aria-selected={i === safeHighlight}
              className={`agents-cb-item${i === safeHighlight ? " is-active" : ""}${
                o.value === "" ? " agents-cb-all" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                pick(o.value);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className="agents-cb-name">{o.label}</span>
              {o.meta && <span className="agents-cb-meta">{o.meta}</span>}
            </li>
          ))}
          {matches.length === 0 && (
            <li className="agents-cb-empty">{noMatchesLabel}</li>
          )}
        </ul>
      )}
    </div>
  );
}
