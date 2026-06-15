"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { useI18n } from "@/lib/i18n/context";
import { setLocaleAction } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

interface LanguageSwitcherProps {
  /** "menu" = globe button + dropdown (navbar). "inline" = button row (footer). */
  variant?: "menu" | "inline";
}

export function LanguageSwitcher({ variant = "menu" }: LanguageSwitcherProps) {
  const { locale, dict } = useI18n();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(() => {
      void setLocaleAction(next);
    });
  }

  if (variant === "inline") {
    return (
      <div className="lang-seg" role="group" aria-label={dict.nav.selectLanguage}>
        {LOCALES.map((l) => {
          const active = l === locale;
          return (
            <button
              key={l}
              type="button"
              lang={l}
              onClick={() => choose(l)}
              aria-pressed={active}
              disabled={pending}
              className={`lang-seg-item${active ? " active" : ""}`}
            >
              {LOCALE_META[l].short}
            </button>
          );
        })}
      </div>
    );
  }

  return <LanguageMenu locale={locale} pending={pending} choose={choose} label={dict.nav.selectLanguage} />;
}

function LanguageMenu({
  locale,
  pending,
  choose,
  label,
}: {
  locale: Locale;
  pending: boolean;
  choose: (l: Locale) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="lang-switcher" style={{ position: "relative" }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ gap: 6 }}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={pending}
      >
        <Icon name="globe" size={14} /> {LOCALE_META[locale].short}
      </button>
      {open ? (
        <div className="lang-menu" role="menu">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              lang={l}
              className={`lang-menu-item${l === locale ? " active" : ""}`}
              onClick={() => {
                choose(l);
                setOpen(false);
              }}
            >
              <span>{LOCALE_META[l].nativeLabel}</span>
              {l === locale ? <Icon name="check" size={14} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
