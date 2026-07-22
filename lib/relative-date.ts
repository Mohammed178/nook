// Shared day-granularity relative-date helpers. Extracted from
// components/account/saved-searches-list.tsx so the "Posted X ago" listing
// labels and the saved-search "matched X ago" line share one implementation.
//
// Day granularity only (today / yesterday / N days ago / a month ago /
// N months ago). Coarse-by-design: server components render these, and a
// day-resolution label is stable enough that a server/client render on the same
// UTC day agree — no hydration mismatch, no per-second ticking.
//
// Intentionally dependency-free (no `@/` value imports): the `{n}` interpolation
// below is the exact logic of lib/i18n/config's format(), inlined so this module
// stays runnable under `node --experimental-strip-types` (see
// scripts/test-relative-date.mjs, mirroring scripts/test-safe-redirect.mjs). The
// `@/` alias only resolves through the Next.js/tsc bundler, not plain node.
function interpolate(template: string, n: number): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key === "n" ? String(n) : match,
  );
}

// The five phrases relativeDate needs, structurally identical to the keys under
// `savedSearches` (today/yesterday/daysAgo/aMonthAgo/monthsAgo) and the new
// `card` posted-* keys. Callers pass whichever dictionary slice matches.
export interface RelativeDateStrings {
  today: string;
  yesterday: string;
  /** "{n} days ago" — {n} filled by interpolate(). */
  daysAgo: string;
  aMonthAgo: string;
  /** "{n} months ago" — {n} filled by interpolate(). */
  monthsAgo: string;
}

// Whole days between `iso` and now, floored, UTC-based. Handles both a date-only
// string ("2026-04-01" → parsed as UTC midnight by Date) and a full ISO
// timestamp ("2026-04-01T09:30:00.000Z"). A future timestamp yields a negative
// number; relativeDate() clamps that to "today".
export function daysSince(iso: string, now: number = Date.now()): number {
  const then = new Date(iso).getTime();
  return Math.floor((now - then) / 86_400_000);
}

// Day-granularity relative label. Mirrors the original saved-searches thresholds
// exactly: <30 days → "N days ago", <60 → "a month ago", else "N months ago"
// (months = floor(days / 30)).
export function relativeDate(
  iso: string,
  s: RelativeDateStrings,
  now: number = Date.now(),
): string {
  const days = daysSince(iso, now);
  if (days <= 0) return s.today;
  if (days === 1) return s.yesterday;
  if (days < 30) return interpolate(s.daysAgo, days);
  if (days < 60) return s.aMonthAgo;
  return interpolate(s.monthsAgo, Math.floor(days / 30));
}
