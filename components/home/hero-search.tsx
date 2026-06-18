import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { SearchForm } from "@/components/home/search-form";
import { HeroDeck } from "@/components/home/hero-deck";
import { getAllAreas } from "@/lib/data/areas";
import { getAllUniversities, toSearchUniversities } from "@/lib/data/universities";
import { HERO_DECK, QUICK_CHIPS } from "@/lib/home-content";
import { getDictionary } from "@/lib/i18n/server";

export async function HeroSearch() {
  const [areas, universities, dict] = await Promise.all([
    getAllAreas(),
    getAllUniversities(),
    getDictionary(),
  ]);
  const h = dict.home;
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

        <HeroDeck photos={HERO_DECK} pillText={h.deckPill} />
      </div>
    </section>
  );
}
