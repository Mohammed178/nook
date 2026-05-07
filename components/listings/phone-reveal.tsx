"use client";

import { useState } from "react";
import { Icon } from "@/components/nook/icon";

interface PhoneRevealProps {
  phone: string;
}

function formatRevealedAt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PhoneReveal({ phone }: PhoneRevealProps) {
  const [revealedAt, setRevealedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

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
        <div className="phone-reveal-num">{phone}</div>
        <div className="phone-reveal-lab">
          {copied ? "Copied" : "Tap to copy"} · revealed at{" "}
          {formatRevealedAt(revealedAt)}
        </div>
      </div>
      <Icon name="check-circle" size={18} style={{ color: "var(--success)" }} />
    </button>
  );
}
