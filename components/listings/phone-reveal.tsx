"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/nook/icon";

interface PhoneRevealProps {
  phone: string;
}

const SCRAMBLE_TICK_MS = 35;
const SETTLE_TICKS_PER_CHAR = 1.6;

function formatRevealedAt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PhoneReveal({ phone }: PhoneRevealProps) {
  const [revealedAt, setRevealedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [display, setDisplay] = useState(phone);

  // Scramble-settle: digits spin randomly, then lock in left-to-right.
  // The conversion micro-moment, skipped under reduced motion.
  useEffect(() => {
    if (!revealedAt) return;
    // display is initialised to the real number, so reduced motion just
    // skips the scramble, nothing to reset.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const chars = phone.split("");
    const interval = window.setInterval(() => {
      frame += 1;
      let settled = true;
      const out = chars
        .map((ch, i) => {
          if (!/\d/.test(ch)) return ch;
          if (frame >= (i + 1) * SETTLE_TICKS_PER_CHAR) return ch;
          settled = false;
          return String(Math.floor(Math.random() * 10));
        })
        .join("");
      setDisplay(out);
      if (settled) window.clearInterval(interval);
    }, SCRAMBLE_TICK_MS);
    return () => window.clearInterval(interval);
  }, [revealedAt, phone]);

  if (!revealedAt) {
    return (
      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        onClick={() => setRevealedAt(new Date())}
      >
        <Icon name="eye" size={16} /> Reveal phone number
      </button>
    );
  }

  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(phone).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      className="phone-reveal revealed"
      onClick={copy}
      style={{
        background: "var(--success-50)",
        borderStyle: "solid",
        borderColor: "var(--success)",
        cursor: "pointer",
      }}
    >
      <div className="phone-reveal-text" style={{ textAlign: "left" }}>
        <div className="phone-reveal-num">{display}</div>
        <div className="phone-reveal-lab">
          {copied ? "Copied" : "Tap to copy"} · revealed at{" "}
          {formatRevealedAt(revealedAt)}
        </div>
      </div>
      <Icon name="check-circle" size={18} style={{ color: "var(--success)" }} />
    </button>
  );
}
