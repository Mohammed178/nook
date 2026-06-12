"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icon";
import { toggleFavouriteAction } from "@/app/listings/actions";

export type HeartVariant = "pill" | "icon";

interface HeartButtonProps {
  listingId: string;
  initialSaved: boolean;
  signedIn: boolean;
  variant?: HeartVariant;
  ariaLabel?: string;
  onToggled?: (saved: boolean) => void;
}

const TOOLTIP_AUTOHIDE_MS = 2500;
const TOOLTIP_HEIGHT_ESTIMATE = 80;
const TOOLTIP_VIEWPORT_BUFFER = 16;
const TOOLTIP_OFFSET = 10;

interface TooltipPos {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

export function HeartButton({
  listingId,
  initialSaved,
  signedIn,
  variant = "pill",
  ariaLabel = "Save listing",
  onToggled,
}: HeartButtonProps) {
  const [saved, setSaved] = useState<boolean>(initialSaved);
  // True only after the user saves in this session — gates the pop animation
  // so initially-saved hearts don't all fire on page load.
  const [justSaved, setJustSaved] = useState(false);
  const [optimisticSaved, applyOptimistic] = useOptimistic<boolean, boolean>(
    saved,
    (_, next) => next,
  );
  const [, startTransition] = useTransition();

  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const autohideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // SSR portal gate: server + first client render both return null so
    // hydration matches; portal renders only after this effect flips mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tooltipPos) return;

    function clearAutohide() {
      if (autohideRef.current) {
        clearTimeout(autohideRef.current);
        autohideRef.current = null;
      }
    }

    autohideRef.current = setTimeout(() => {
      setTooltipPos(null);
    }, TOOLTIP_AUTOHIDE_MS);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearAutohide();
        setTooltipPos(null);
      }
    }
    function onScroll() {
      clearAutohide();
      setTooltipPos(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      clearAutohide();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [tooltipPos]);

  function clearAutohide() {
    if (autohideRef.current) {
      clearTimeout(autohideRef.current);
      autohideRef.current = null;
    }
  }

  function onLeave() {
    clearAutohide();
    setTooltipPos(null);
  }

  function onBlur() {
    clearAutohide();
    setTooltipPos(null);
  }

  function openTooltip() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportH =
      typeof window !== "undefined" ? window.innerHeight : 0;
    const spaceBelow = viewportH - rect.bottom;
    const preferred: "top" | "bottom" = variant === "pill" ? "bottom" : "top";
    const placement: "top" | "bottom" =
      preferred === "bottom"
        ? spaceBelow < TOOLTIP_HEIGHT_ESTIMATE + TOOLTIP_VIEWPORT_BUFFER
          ? "top"
          : "bottom"
        : rect.top < TOOLTIP_HEIGHT_ESTIMATE + TOOLTIP_VIEWPORT_BUFFER
          ? "bottom"
          : "top";
    const top =
      placement === "top"
        ? rect.top - TOOLTIP_OFFSET
        : rect.bottom + TOOLTIP_OFFSET;
    const left = rect.left;
    setTooltipPos({ top, left, placement });
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!signedIn) {
      openTooltip();
      return;
    }

    const next = !saved;
    setJustSaved(next);
    startTransition(async () => {
      applyOptimistic(next);
      onToggled?.(next);
      const result = await toggleFavouriteAction(listingId);
      if ("error" in result) {
        if (typeof console !== "undefined") {
          console.error("favourite toggle failed:", result.error);
        }
        return;
      }
      setSaved(result.saved);
    });
  }

  const filled = optimisticSaved;
  const btnClass = `heart-btn heart-btn-${variant}${filled ? " is-saved" : ""}${
    filled && justSaved ? " just-saved" : ""
  }`;

  const tooltipNode =
    tooltipPos && mounted
      ? createPortal(
          <span
            className={`heart-tooltip heart-tooltip-${tooltipPos.placement}`}
            role="status"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
          >
            Sign in to save listings
          </span>,
          document.body,
        )
      : null;

  return (
    <span className="heart-btn-wrap" ref={wrapRef} onMouseLeave={onLeave}>
      <button
        ref={buttonRef}
        type="button"
        aria-pressed={filled}
        aria-label={ariaLabel}
        className={btnClass}
        onClick={handleClick}
        onBlur={onBlur}
      >
        <Icon
          name={filled ? "heart-fill" : "heart"}
          size={variant === "icon" ? 16 : 18}
        />
      </button>
      {tooltipNode}
    </span>
  );
}
