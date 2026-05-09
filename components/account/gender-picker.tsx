"use client";

import { useState } from "react";

const OPTIONS = [
  { value: "female", label: "Female-only" },
  { value: "male", label: "Male-only" },
  { value: "mixed", label: "Mixed" },
  { value: "", label: "Skip" },
] as const;

interface GenderPickerProps {
  name: string;
  defaultValue?: string;
  ariaLabel?: string;
}

export function GenderPicker({
  name,
  defaultValue = "",
  ariaLabel = "Gender preference",
}: GenderPickerProps) {
  const [value, setValue] = useState<string>(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="gender-pills" role="radiogroup" aria-label={ariaLabel}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value || "skip"}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`gender-pill ${value === opt.value ? "active" : ""}`}
            onClick={() => setValue(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}
