import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { SearchForm } from "@/components/home/search-form";
import { HeroDeck } from "@/components/home/hero-deck";
import { getAllAreas } from "@/lib/data/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";
import {
  HERO_DECK,
  HERO_DECK_PILL,
  HERO_HEADLINE,
  HERO_LEDE,
  HERO_SEARCH_HINTS,
  QUICK_CHIPS,
} from "@/lib/home-content";

export async function HeroSearch() {
  const areas = await getAllAreas();
  return (
    <section className="hero">
      <Navbar active="home" />
      <div className="hero-inner">
        <div>
          <h1>{HERO_HEADLINE}</h1>
          <p className="lede">{HERO_LEDE}</p>

          <SearchForm
            variant="hero"
            areas={areas}
            universities={UNIVERSITIES}
            placeholderHints={HERO_SEARCH_HINTS}
          />

          <div className="quick-chips">
            <span className="qc-label">Popular:</span>
            {QUICK_CHIPS.map((c) => (
              <Link key={c.label} href={c.href} className="qc-chip">
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        <HeroDeck photos={HERO_DECK} pillText={HERO_DECK_PILL} />
      </div>
    </section>
  );
}
