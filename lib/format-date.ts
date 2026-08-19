// Shared absolute-date formatter for the listing surfaces.
//
// `listings.available_from` is a DATE column, so the value arrives as a bare
// "YYYY-MM-DD". Formatting it in the viewer's timezone would render the day
// before anywhere west of UTC, and would disagree between the server render and
// the client hydration of the same card. Formatting in UTC keeps a date-only
// value on the day the agent actually typed, on both sides of the render.
import { LOCALE_DATE_TAG, type Locale } from "@/lib/i18n/config";

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}
