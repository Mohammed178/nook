import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { SearchForm } from "@/components/home/search-form";
import { getAllAreas } from "@/lib/data/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";
import {
  HERO_HEADLINE,
  HERO_IMAGE_URL,
  HERO_LEDE,
  QUICK_CHIPS,
} from "@/lib/home-content";

export async function HeroSearch() {
  const areas = await getAllAreas();
  return (
    <section
      className="hero"
      style={{ ["--hero-bg" as string]: `url('${HERO_IMAGE_URL}')` }}
    >
      <Navbar transparent active="home" />
      <div className="hero-inner">
        <h1>{HERO_HEADLINE}</h1>
        <p className="lede">{HERO_LEDE}</p>

        <SearchForm variant="hero" areas={areas} universities={UNIVERSITIES} />

        <div className="quick-chips">
          <span className="qc-label">Popular:</span>
          {QUICK_CHIPS.map((c) => (
            <Link key={c.label} href={c.href} className="qc-chip">
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
