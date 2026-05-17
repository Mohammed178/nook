"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/nook/icon";
import { suggestSearchName } from "@/lib/saved-search-summary";
import { addSavedSearchAction } from "@/app/listings/actions";
import type { ListingSearchParams } from "@/lib/listings-search";

interface SaveSearchDialogProps {
  open: boolean;
  anchor: DOMRect | null;
  query: ListingSearchParams;
  onClose: () => void;
  onSaved: () => void;
}

const POPOVER_WIDTH = 320;
const POPOVER_OFFSET = 8;

export function SaveSearchDialog({
  open,
  anchor,
  query,
  onClose,
  onSaved,
}: SaveSearchDialogProps) {
  const [name, setName] = useState<string>(() => suggestSearchName(query));
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // SSR portal gate: server + first client render both return null so
  // hydration matches; portal renders only after this effect flips mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setName(suggestSearchName(query));
    setError(null);
    setDuplicateWarning(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      if (!dialogRef.current?.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  function submit(force: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await addSavedSearchAction({ name, query, force });
      if ("ok" in result) {
        onSaved();
        return;
      }
      if ("duplicate" in result) {
        setDuplicateWarning(result.existingName);
        return;
      }
      setError(result.error);
    });
  }

  if (!mounted || !open || !anchor) return null;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const right = Math.max(8, viewportW - anchor.right);
  const top = anchor.bottom + POPOVER_OFFSET;

  return createPortal(
    <div
      ref={dialogRef}
      className="save-search-popover"
      role="dialog"
      aria-label="Save this search"
      style={{ top, right, width: POPOVER_WIDTH }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(duplicateWarning !== null);
        }}
      >
        <label className="label" htmlFor="ss-name">
          Name this search
        </label>
        <input
          ref={inputRef}
          id="ss-name"
          className="input"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDuplicateWarning(null);
          }}
          maxLength={100}
          required
        />
        {duplicateWarning ? (
          <div className="save-search-warn" role="status">
            <Icon name="check-circle" size={14} />
            You already have one with these filters
            {duplicateWarning ? ` (“${duplicateWarning}”)` : ""}.
            Save anyway?
          </div>
        ) : null}
        {error ? (
          <div className="save-search-error" role="alert">
            {error}
          </div>
        ) : null}
        <div className="save-search-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={pending || name.trim().length === 0}
          >
            {pending
              ? "Saving…"
              : duplicateWarning
                ? "Save anyway"
                : "Save"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
