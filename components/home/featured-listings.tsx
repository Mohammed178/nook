import Link from "next/link";
import { ListingCard } from "@/components/nook/listing-card";
import { getFeaturedListings } from "@/lib/data/featured";
import { attachListingRelations } from "@/lib/data/listings-relations";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function FeaturedListings() {
  const listings = await getFeaturedListings();
  if (listings.length === 0) return null;
  const [items, dict, locale] = await Promise.all([
    attachListingRelations(listings),
    getDictionary(),
    getLocale(),
  ]);
  const h = dict.home;

  return (
    <section className="home-container tight">
      <div className="home-sec-head">
        <div>
          <h2>{h.freshTitle}</h2>
          <div className="sub">{h.freshSub}</div>
        </div>
        <Link href="/listings" className="more">{h.seeAllRooms}</Link>
      </div>
      <div className="lc-grid">
        {items.map(({ listing, agent, area }) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            agent={agent}
            area={area}
            card={dict.card}
            locale={locale}
            variant="homepage"
          />
        ))}
      </div>
    </section>
  );
}
