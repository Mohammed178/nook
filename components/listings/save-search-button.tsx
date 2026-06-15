"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { useDict } from "@/lib/i18n/context";
import { SaveSearchDialog } from "./save-search-dialog";
import type { ListingSearchParams } from "@/lib/listings-search";
import type { AreaLookup } from "@/lib/saved-search-summary";

interface SaveSearchButtonProps {
  query: ListingSearchParams;
  signedIn: boolean;
  areaLookup: AreaLookup;
}

const TOOLTIP_AUTOCLOSE_MS = 3000;

interface TipPos {
  top: number;
  right: number;
}

export function SaveSearchButton({
  query,
  signedIn,
  areaLookup,
}: SaveSearchButtonProps) {
  const dict = useDict();
  const s = dict.savedSearches;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [tipPos, setTipPos] = useState<TipPos | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!tipPos) return;
    const id = window.setTimeout(() => setTipPos(null), TOOLTIP_AUTOCLOSE_MS);
    function onScroll() {
      setTipPos(null);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [tipPos]);

  useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 3000);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (!signedIn) {
      const viewportW = window.innerWidth;
      setTipPos({
        top: rect.bottom + 8,
        right: Math.max(8, viewportW - rect.right),
      });
      return;
    }
    setAnchor(rect);
    setDialogOpen(true);
  }

  return (
    <>
      <span className="save-search-wrap">
        <button
          ref={btnRef}
          type="button"
          className="btn btn-secondary btn-sm save-search-trigger"
          onClick={handleClick}
        >
          <Icon name="bookmark" size={14} />
          {s.saveThisSearch}
        </button>
        {savedFlash ? (
          <span className="save-search-flash" role="status" aria-live="polite">
            <Icon name="check" size={14} /> {dict.common.saved}
          </span>
        ) : null}
      </span>
      {tipPos ? (
        <span
          className="save-search-tip"
          role="status"
          style={{ top: tipPos.top, right: tipPos.right }}
        >
          {s.signInToSave}
        </span>
      ) : null}
      <SaveSearchDialog
        open={dialogOpen}
        anchor={anchor}
        query={query}
        areaLookup={areaLookup}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          setSavedFlash(true);
        }}
      />
    </>
  );
}
