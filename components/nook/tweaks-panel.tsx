"use client";

import { useEffect, useState } from "react";
import type { BrandTone, Density, Locale } from "@/lib/types";

const BRAND_OPTIONS: Record<BrandTone, Record<string, string>> = {
  olive: {
    "--brand-500": "#6B7A3A",
    "--brand-600": "#556230",
    "--brand-700": "#3F4A24",
    "--brand-50": "#F2F4EA",
    "--brand-100": "#E1E6CD",
    "--brand-200": "#C9D2A6",
  },
  burnt: {
    "--brand-500": "#C85A2A",
    "--brand-600": "#A8461E",
    "--brand-700": "#7E3414",
    "--brand-50": "#FBEDE3",
    "--brand-100": "#F3D2BC",
    "--brand-200": "#E5A883",
  },
  red: {
    "--brand-500": "#E63946",
    "--brand-600": "#C92434",
    "--brand-700": "#A31C29",
    "--brand-50": "#FFEEEF",
    "--brand-100": "#FFD7DA",
    "--brand-200": "#FFB8BD",
  },
};

const SWATCH_HEX: Record<BrandTone, string> = {
  olive: "#6B7A3A",
  burnt: "#C85A2A",
  red: "#E63946",
};

function applyBrand(brand: BrandTone) {
  const root = document.documentElement;
  const colors = BRAND_OPTIONS[brand] ?? BRAND_OPTIONS.burnt;
  Object.entries(colors).forEach(([k, v]) => root.style.setProperty(k, v));
}

function applyDensity(d: Density) {
  document.documentElement.dataset.density = d;
}

function applyLocale(l: Locale) {
  const root = document.documentElement;
  root.dataset.lang = l;
  root.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
  root.setAttribute("lang", l === "ms" ? "ms" : l === "ar" ? "ar" : "en");
}

export function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<BrandTone>("burnt");
  const [density, setDensity] = useState<Density>("default");
  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    const b = (localStorage.getItem("nook.brand") as BrandTone) || "burnt";
    const d = (localStorage.getItem("nook.density") as Density) || "default";
    const l = (localStorage.getItem("nook.lang") as Locale) || "en";
    setBrand(b);
    setDensity(d);
    setLang(l);
  }, []);

  const updateBrand = (b: BrandTone) => {
    localStorage.setItem("nook.brand", b);
    setBrand(b);
    applyBrand(b);
  };
  const updateDensity = (d: Density) => {
    localStorage.setItem("nook.density", d);
    setDensity(d);
    applyDensity(d);
  };
  const updateLang = (l: Locale) => {
    localStorage.setItem("nook.lang", l);
    setLang(l);
    applyLocale(l);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open tweaks panel"
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 100,
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "#fff",
          border: "1px solid var(--ink-200)",
          boxShadow: "0 6px 18px rgba(0,0,0,.12)",
          cursor: "pointer",
          fontSize: 18,
        }}
      >
        ⚙
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 280,
        zIndex: 100,
        background: "#fff",
        border: "1px solid var(--ink-200)",
        borderRadius: 8,
        boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
        padding: 16,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <strong
          style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".04em" }}
        >
          Tweaks
        </strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-500)",
            fontSize: 18,
          }}
          aria-label="Close tweaks"
        >
          ×
        </button>
      </div>

      <Section label="Brand colour">
        <div style={{ display: "flex", gap: 6 }}>
          {(["olive", "burnt", "red"] as BrandTone[]).map((b) => (
            <Swatch
              key={b}
              active={brand === b}
              color={SWATCH_HEX[b]}
              label={b === "burnt" ? "Burnt" : b === "olive" ? "Olive" : "Red"}
              onClick={() => updateBrand(b)}
            />
          ))}
        </div>
      </Section>

      <Section label="Density">
        <Radio
          value={density}
          options={[
            { val: "compact", label: "Compact" },
            { val: "default", label: "Default" },
            { val: "comfortable", label: "Roomy" },
          ]}
          onChange={(v) => updateDensity(v as Density)}
        />
      </Section>

      <Section label="Language" last>
        <Radio
          value={lang}
          options={[
            { val: "en", label: "EN" },
            { val: "ms", label: "BM" },
            { val: "ar", label: "AR" },
          ]}
          onChange={(v) => updateLang(v as Locale)}
        />
        <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 6 }}>
          AR switches the page to RTL.
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ink-500)",
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Swatch({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: 8,
        border: active ? "2px solid var(--ink-900)" : "1px solid var(--ink-300)",
        background: "#fff",
        borderRadius: 6,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 6, background: color }} />
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function Radio<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { val: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "var(--ink-100)",
        padding: 3,
        borderRadius: 6,
      }}
    >
      {options.map((o) => {
        const active = value === o.val;
        return (
          <button
            type="button"
            key={o.val}
            onClick={() => onChange(o.val)}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 4,
              background: active ? "#fff" : "transparent",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              fontSize: 12,
              fontWeight: 600,
              color: active ? "var(--ink-900)" : "var(--ink-500)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
