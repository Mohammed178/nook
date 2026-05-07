"use client";

import { useState } from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

interface HeartButtonProps {
  initialSaved?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function HeartButton({
  initialSaved = false,
  className,
  ariaLabel = "Save listing",
}: HeartButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved((s) => !s);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-white/90 backdrop-blur w-9 h-9 shadow-sm hover:bg-white transition",
        className,
      )}
    >
      <Icon
        name="heart"
        size={18}
        className={cn(saved ? "text-[var(--brand-500)]" : "text-[var(--ink-700)]")}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
