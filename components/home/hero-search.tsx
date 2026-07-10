import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { SearchForm } from "@/components/home/search-form";
import { HeroDeck } from "@/components/home/hero-deck";
import { getAllAreas } from "@/lib/data/areas";
import { getAllUniversities, toSearchUniversities } from "@/lib/data/universities";
import { getAllListings } from "@/lib/data/listings";
import { HERO_DECK, QUICK_CHIPS } from "@/lib/home-content";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { haversineKm } from "@/lib/distance";

// Deck pill radius: "near UM" = within 5 km of campus, matching the original
// (hardcoded) pill's claim, now computed from live listings instead.
const DECK_PILL_RADIUS_KM = 5;

export async function HeroSearch() {
  const [areas, universities, listings, dict] = await Promise.all([
    getAllAreas(),
    getAllUniversities(),
    getAllListings(),
    getDictionary(),
  ]);
  const h = dict.home;

  const um = universities.find((u) => u.slug === "um");
  let cheapestNearUm: number | null = null;
  if (um) {
    for (const l of listings) {
      if (l.status !== "available" || l.lat == null || l.lng == null) continue;
      if (haversineKm(l.lat, l.lng, um.lat, um.lng) > DECK_PILL_RADIUS_KM) continue;
      if (cheapestNearUm === null || l.priceMonthly < cheapestNearUm) {
        cheapestNearUm = l.priceMonthly;
      }
    }
  }
  const pillText =
    cheapestNearUm !== null
      ? format(h.deckPill, { price: String(cheapestNearUm) })
      : h.deckPillFallback;
  return (
    <section className="hero">
      <Navbar active="home" />
      <div className="hero-inner">
        <div>
          <h1>{h.heroHeadline}</h1>
          <p className="lede">{h.heroLede}</p>

          <SearchForm
            variant="hero"
            areas={areas}
            universities={toSearchUniversities(universities)}
            placeholderHints={h.searchHints}
          />

          <div className="quick-chips">
            <span className="qc-label">{h.popular}</span>
            {QUICK_CHIPS.map((c, i) => (
              <Link key={c.href} href={c.href} className="qc-chip">
                {h.quickChips[i] ?? c.label}
              </Link>
            ))}
          </div>
        </div>

        <HeroDeck photos={HERO_DECK} pillText={pillText} />
      </div>
    </section>
  );
}
