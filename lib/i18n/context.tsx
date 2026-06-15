"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

interface I18nValue {
  dict: Dictionary;
  locale: Locale;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Provides the active dictionary + locale to client components. Mounted once in
 * the root layout (a Server Component) with server-resolved props, so the dict
 * is serialized to the client exactly once.
 */
export function I18nProvider({
  dict,
  locale,
  children,
}: I18nValue & { children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ dict, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return value;
}

/** Shorthand for components that only need the dictionary. */
export function useDict(): Dictionary {
  return useI18n().dict;
}

/** Shorthand for components that only need the active locale. */
export function useLocale(): Locale {
  return useI18n().locale;
}
