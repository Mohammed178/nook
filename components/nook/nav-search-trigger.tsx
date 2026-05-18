"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { SearchForm } from "@/components/home/search-form";
import type { Area, University } from "@/lib/types";

interface NavSearchTriggerProps {
  areas: Area[];
  universities: University[];
}

export function NavSearchTrigger({
  areas,
  universities,
}: NavSearchTriggerProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (isMobile) return; // mobile uses backdrop
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    if (isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("mousedown", onClick);
        document.body.style.overflow = prev;
      };
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, isMobile]);

  if (pathname === "/") return null;

  const close = () => setOpen(false);

  return (
    <div className="nav-search-pill-wrap" ref={wrapperRef}>
      <button
        type="button"
        className="nav-search-pill"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open search"
      >
        <span className="ph">Search rooms near your campus</span>
        <span className="nsp-icon">
          <Icon name="search" size={14} strokeWidth={2.4} />
        </span>
      </button>

      {open && !isMobile && (
        <div className="popover nav-search-popover" role="dialog" aria-label="Search">
          <SearchForm
              variant="popover"
              onSubmitNavigate={close}
              areas={areas}
              universities={universities}
            />
        </div>
      )}

      {open && isMobile && (
        <div
          className="sheet-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="sheet nav-search-sheet">
            <div className="sheet-head">
              <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Search</h2>
              <button
                type="button"
                className="btn btn-icon"
                onClick={close}
                aria-label="Close"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="sheet-body">
              <SearchForm
              variant="popover"
              onSubmitNavigate={close}
              areas={areas}
              universities={universities}
            />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
