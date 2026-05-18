import Link from "next/link";
import { ListingCard } from "@/components/nook/listing-card";
import { getFeaturedListings } from "@/lib/data/featured";
import { attachListingRelations } from "@/lib/data/listings-relations";

export async function FeaturedListings() {
  const listings = await getFeaturedListings();
  if (listings.length === 0) return null;
  const items = await attachListingRelations(listings);

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
        {items.map(({ listing, agent, area }) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            agent={agent}
            area={area}
            variant="homepage"
          />
        ))}
      </div>
    </section>
  );
}
