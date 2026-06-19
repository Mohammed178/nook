// Google Maps link → coordinates.
//
// Agents paste a Google Maps link instead of typing raw lat/lng. Most links
// carry the coordinates in the URL itself (the `@lat,lng` viewport segment, a
// `q=lat,lng` query param, or the `!3d<lat>!4d<lng>` place-data marker), so they
// parse with zero network calls. Short share links (maps.app.goo.gl / goo.gl)
// carry no coordinates and must be resolved server-side by following the
// redirect — see resolveMapsLinkAction. Keep the network reach there constrained
// to Google hosts (SSRF guard).

export interface Coords {
  lat: number;
  lng: number;
}

// Reject out-of-range / non-finite values so a stray match never pins the map
// in the ocean.
function valid(lat: number, lng: number): Coords | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// "lat,lng" possibly padded with spaces — used by the q/ll/destination params.
function fromPair(raw: string): Coords | null {
  const m = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m ? valid(Number(m[1]), Number(m[2])) : null;
}

// Scan arbitrary text (a URL string, or a redirect-target HTML body) for the two
// coordinate shapes Google embeds. The `!3d!4d` place marker is the exact pinned
// place, so it wins over the `@` viewport centre when both are present.
export function extractCoordsFromText(text: string): Coords | null {
  const place = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (place) {
    const c = valid(Number(place[1]), Number(place[2]));
    if (c) return c;
  }
  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const c = valid(Number(at[1]), Number(at[2]));
    if (c) return c;
  }
  return null;
}

// Best-effort extraction from a single Google Maps URL. Returns null when the
// link carries no coordinates (e.g. an unresolved short link) — the caller then
// decides whether to resolve it over the network.
export function extractCoordsFromMapsUrl(input: string): Coords | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // 1. The place-data marker (exact pinned place) wins.
  const place = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (place) {
    const c = valid(Number(place[1]), Number(place[2]));
    if (c) return c;
  }

  // 2. Query params that carry "lat,lng".
  for (const key of ["q", "query", "ll", "center", "destination", "viewpoint"]) {
    const v = url.searchParams.get(key);
    if (v) {
      const c = fromPair(v);
      if (c) return c;
    }
  }

  // 3. The @lat,lng,zoom viewport segment.
  const at = raw.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const c = valid(Number(at[1]), Number(at[2]));
    if (c) return c;
  }

  return null;
}

// Short share links carry no coordinates — they must be expanded by following
// the redirect. Limited to Google's own short-link hosts so the server-side
// fetch can never be pointed at an arbitrary URL.
export function isShortMapsUrl(input: string): boolean {
  try {
    const h = new URL(input).hostname.toLowerCase();
    return h === "maps.app.goo.gl" || h === "goo.gl" || h === "g.co";
  } catch {
    return false;
  }
}
