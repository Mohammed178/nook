import Link from "next/link";
import { ListingCard } from "@/components/nook/listing-card";
import { getFeaturedListings } from "@/lib/queries";

export function FeaturedListings() {
  const listings = getFeaturedListings();
  if (listings.length === 0) return null;

  return (
    <section className="home-container tight">
      <div className="home-sec-head">
        <div>
          <h2>Fresh on Nook this week</h2>
          <div className="sub">Newly verified rooms, hand-picked from agents with 4.5★+ ratings.</div>
        </div>
        <Link href="/listings" className="more">See all 12,400+ rooms →</Link>
      </div>
      <div className="lc-grid">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} variant="homepage" />
        ))}
      </div>
    </section>
  );
}
