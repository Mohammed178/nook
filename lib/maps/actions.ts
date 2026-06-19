"use server";

import { getDictionary } from "@/lib/i18n/server";
import {
  extractCoordsFromMapsUrl,
  extractCoordsFromText,
  isShortMapsUrl,
} from "@/lib/maps/google-maps-url";

// Turns a pasted Google Maps link into coordinates. Full links (carrying
// @lat,lng or a !3d!4d marker) parse with no network call. Only Google's own
// short share links (maps.app.goo.gl / goo.gl / g.co) trigger a fetch, and only
// to follow their redirect — the host allowlist is the SSRF guard, so the fetch
// can never be aimed at an arbitrary URL. Pure coordinate lookup, no DB write
// and no auth: shared by the agent listing picker and the admin university form.
export interface ResolveMapsLinkResult {
  lat?: number;
  lng?: number;
  error?: string;
}

async function resolveShortMapsLink(shortUrl: string) {
  const res = await fetch(shortUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(6000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NookBot/1.0)" },
  });
  // res.url is the final URL after all redirects; it usually carries the coords.
  const fromUrl = extractCoordsFromMapsUrl(res.url);
  if (fromUrl) return fromUrl;
  // Fallback: the expanded page body often embeds the canonical @/!3d!4d URL.
  return extractCoordsFromText(await res.text());
}

export async function resolveMapsLinkAction(
  url: string,
): Promise<ResolveMapsLinkResult> {
  const e = (await getDictionary()).errors;
  const raw = (url ?? "").trim();
  if (!raw) return { error: e.mapsLinkEmpty };

  // Parse the link as-is first — covers the common google.com/maps cases.
  const direct = extractCoordsFromMapsUrl(raw);
  if (direct) return direct;

  // Otherwise only Google short links earn a network resolve (SSRF guard).
  if (!isShortMapsUrl(raw)) return { error: e.mapsLinkUnparsed };

  try {
    const resolved = await resolveShortMapsLink(raw);
    if (!resolved) return { error: e.mapsLinkUnparsed };
    return resolved;
  } catch {
    return { error: e.mapsLinkResolveFailed };
  }
}
