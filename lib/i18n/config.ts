// i18n configuration, framework-agnostic (no next/server imports here so this
// can be pulled into client and middleware bundles safely).

export const LOCALES = ["en", "ms", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Cookie that carries the chosen locale. Read server-side in the root layout,
// written by setLocaleAction and synced from profiles.preferred_language at login.
export const LOCALE_COOKIE = "nook_locale";

export type Dir = "ltr" | "rtl";

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; short: string; dir: Dir }
> = {
  en: { label: "English", nativeLabel: "English", short: "EN", dir: "ltr" },
  ms: { label: "Malay", nativeLabel: "Bahasa Melayu", short: "BM", dir: "ltr" },
  ar: { label: "Arabic", nativeLabel: "العربية", short: "عربي", dir: "rtl" },
};

// BCP-47 tags for Intl formatters (dates, numbers). Malaysia region for en/ms;
// Arabic uses the bare tag so digits render as Western Arabic numerals to match
// the RM-prefixed prices used across the app.
export const LOCALE_DATE_TAG: Record<Locale, string> = {
  en: "en-MY",
  ms: "ms-MY",
  ar: "ar",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): Dir {
  return LOCALE_META[locale].dir;
}

/**
 * Fill `{placeholder}` slots in a translated string.
 *   format("Welcome back, {name}", { name }) -> "Welcome back, Ali"
 * Values are coerced to strings; a missing key leaves the slot untouched.
 */
export function format(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
