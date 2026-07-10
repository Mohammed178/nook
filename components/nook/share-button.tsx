"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";

interface ShareButtonProps {
  /** Share-sheet title (falls back to document.title when omitted). */
  title?: string;
  label: string;
  copiedLabel: string;
  /** "sm" = text button (listings header) · "icon" = icon-only (detail page). */
  variant: "sm" | "icon";
}

// Native share sheet where available (mobile), clipboard-copy fallback with a
// visible "Link copied" confirmation elsewhere. Shares the CURRENT url so the
// same component serves both the filtered listings page and a listing detail.
export function ShareButton({ title, label, copiedLabel, variant }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? document.title, url });
      } catch {
        // User dismissed the sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions) — leave the button as-is.
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="btn btn-icon"
        aria-label={copied ? copiedLabel : label}
        aria-live="polite"
        onClick={onShare}
      >
        <Icon name={copied ? "check" : "share"} size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      aria-live="polite"
      onClick={onShare}
    >
      <Icon name={copied ? "check" : "share"} size={14} />{" "}
      {copied ? copiedLabel : label}
    </button>
  );
}
