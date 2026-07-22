// Unit tests for lib/relative-date.ts (daysSince + relativeDate).
// Run: node --experimental-strip-types scripts/test-relative-date.mjs
//
// Mirrors the test-safe-redirect.mjs convention: node's built-in assert, a fixed
// `now` so the day math is deterministic, and a plain pass counter. Covers the
// threshold boundaries the saved-search label and the "Posted X ago" label both
// depend on (0/1/29/30/59/60 days), plus date-only vs full-ISO parsing.
import assert from "node:assert/strict";
import { daysSince, relativeDate } from "../lib/relative-date.ts";

// English-shaped strings; format() interpolates {n}. Matching card.posted* /
// savedSearches keys in the real dictionaries.
const S = {
  today: "today",
  yesterday: "yesterday",
  daysAgo: "{n} days ago",
  aMonthAgo: "a month ago",
  monthsAgo: "{n} months ago",
};

// Fixed reference instant (a daytime UTC moment, like a real Date.now()) so the
// day math is deterministic. daysAgoIso subtracts exact 24h multiples, so
// daysSince(daysAgoIso(k)) === k regardless of the time-of-day offset.
const NOW = Date.parse("2026-07-22T12:00:00.000Z");
// iso for exactly `days` whole days before NOW, at UTC midnight.
const daysAgoIso = (days) =>
  new Date(NOW - days * 86_400_000).toISOString();

let pass = 0;
let count = 0;
function check(actual, expected, label) {
  count++;
  assert.equal(actual, expected, `${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  console.log(`ok  ${label} -> ${JSON.stringify(actual)}`);
  pass++;
}

// ---- daysSince boundaries ----
check(daysSince(daysAgoIso(0), NOW), 0, "daysSince 0");
check(daysSince(daysAgoIso(1), NOW), 1, "daysSince 1");
check(daysSince(daysAgoIso(29), NOW), 29, "daysSince 29");
check(daysSince(daysAgoIso(30), NOW), 30, "daysSince 30");
check(daysSince(daysAgoIso(59), NOW), 59, "daysSince 59");
check(daysSince(daysAgoIso(60), NOW), 60, "daysSince 60");
// A future timestamp yields a negative daysSince (relativeDate clamps to today).
check(daysSince(daysAgoIso(-2), NOW), -2, "daysSince future");

// ---- relativeDate thresholds ----
check(relativeDate(daysAgoIso(0), S, NOW), "today", "relative 0 days");
check(relativeDate(daysAgoIso(1), S, NOW), "yesterday", "relative 1 day");
check(relativeDate(daysAgoIso(2), S, NOW), "2 days ago", "relative 2 days");
check(relativeDate(daysAgoIso(29), S, NOW), "29 days ago", "relative 29 days (last day-granular)");
check(relativeDate(daysAgoIso(30), S, NOW), "a month ago", "relative 30 days (a month)");
check(relativeDate(daysAgoIso(59), S, NOW), "a month ago", "relative 59 days (still a month)");
check(relativeDate(daysAgoIso(60), S, NOW), "2 months ago", "relative 60 days (2 months)");
check(relativeDate(daysAgoIso(90), S, NOW), "3 months ago", "relative 90 days (3 months)");
// Future timestamp clamps to today (days <= 0 branch).
check(relativeDate(daysAgoIso(-5), S, NOW), "today", "relative future clamps to today");

// ---- date-only vs full ISO input ----
// A bare date string is parsed by Date as UTC midnight, same instant daysAgoIso
// produces, so both forms agree.
check(daysSince("2026-07-22", NOW), 0, "date-only today (UTC midnight)");
check(daysSince("2026-07-21", NOW), 1, "date-only yesterday");
check(relativeDate("2026-07-01", S, NOW), "21 days ago", "date-only 21 days ago");
check(relativeDate("2026-04-23", S, NOW), "3 months ago", "date-only ~90 days -> months");
// Full ISO with a time component on the same UTC day still reads as today.
check(daysSince("2026-07-22T09:30:00.000Z", NOW), 0, "full-ISO same UTC day");

console.log(`\n${pass}/${count} passed`);
