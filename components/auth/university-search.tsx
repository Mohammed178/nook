"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { useDict } from "@/lib/i18n/context";

interface UniversitySearchProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}

export function UniversitySearch({
  name,
  defaultValue = "",
  placeholder,
}: UniversitySearchProps) {
  const t = useDict().uniSearch;
  const placeholderText = placeholder ?? t.placeholder;
  const [selectedId, setSelectedId] = useState<string>(defaultValue);
  const [query, setQuery] = useState<string>(() => {
    const u = UNIVERSITIES.find((x) => x.id === defaultValue);
    return u ? u.name : "";
  });
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UNIVERSITIES;
    return UNIVERSITIES.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.shortName.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  function pick(id: string, label: string) {
    setSelectedId(id);
    setQuery(label);
    setOpen(false);
  }

  function clear() {
    setSelectedId("");
    setQuery("");
    setOpen(true);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[activeIdx]) {
        e.preventDefault();
        pick(matches[activeIdx].id, matches[activeIdx].name);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="uni-search" ref={wrapRef}>
      <input type="hidden" name={name} value={selectedId} />
      <div className="uni-search-input-wrap">
        <span className="uni-search-icon">
          <Icon name="school" size={16} />
        </span>
        <input
          className="input uni-search-input"
          type="text"
          autoComplete="off"
          placeholder={placeholderText}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKey}
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {query ? (
          <button
            type="button"
            className="uni-search-clear"
            onClick={clear}
            aria-label={t.clear}
          >
            <Icon name="x" size={14} />
          </button>
        ) : null}
      </div>
      {open && matches.length > 0 ? (
        <ul className="uni-search-menu" ref={listRef} role="listbox">
          {matches.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={i === activeIdx}
              className={`uni-search-item ${i === activeIdx ? "active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u.id, u.name);
              }}
            >
              <span className="uni-search-item-name">{u.name}</span>
              <span className="uni-search-item-meta">
                {u.shortName} · {u.city}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {open && matches.length === 0 ? (
        <ul className="uni-search-menu">
          <li className="uni-search-empty">{t.noMatches}</li>
        </ul>
      ) : null}
    </div>
  );
}
