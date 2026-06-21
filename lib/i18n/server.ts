import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "./config";
import type { Dictionary } from "./dictionaries/en";

// Dynamic imports keep each locale's strings in its own chunk; only the active
// locale is loaded per request. Runs on the server only, so dictionary size
// never reaches the client bundle.
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  ms: () => import("./dictionaries/ms").then((m) => m.default),
  ar: () => import("./dictionaries/ar").then((m) => m.default),
};

/** Active locale from the cookie, falling back to the default. cache()d so the
 * navbar, page body and generateMetadata share one cookie read per render. */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Load a dictionary. Defaults to the request's active locale when omitted. */
export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const active = locale ?? (await getLocale());
  return loaders[active]();
}
