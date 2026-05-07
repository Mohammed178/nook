import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { SearchForm } from "@/components/home/search-form";
import {
  HERO_HEADLINE,
  HERO_IMAGE_URL,
  HERO_LEDE,
  QUICK_CHIPS,
} from "@/lib/home-content";

export function HeroSearch() {
  return (
    <section
      className="hero"
      style={{ ["--hero-bg" as string]: `url('${HERO_IMAGE_URL}')` }}
    >
      <Navbar transparent active="home" />
      <div className="hero-inner">
        <h1>{HERO_HEADLINE}</h1>
        <p className="lede">{HERO_LEDE}</p>

        <SearchForm variant="hero" />

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
