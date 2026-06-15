"use client";

import { useState } from "react";
import { useDict } from "@/lib/i18n/context";

interface GenderPickerProps {
  name: string;
  defaultValue?: string;
  ariaLabel?: string;
}

export function GenderPicker({
  name,
  defaultValue = "",
  ariaLabel,
}: GenderPickerProps) {
  const g = useDict().genderPicker;
  const options = [
    { value: "female", label: g.femaleOnly },
    { value: "male", label: g.maleOnly },
    { value: "mixed", label: g.mixed },
    { value: "", label: g.skip },
  ] as const;
  const [value, setValue] = useState<string>(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div
        className="gender-pills"
        role="radiogroup"
        aria-label={ariaLabel ?? g.ariaLabel}
      >
        {options.map((opt) => (
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
