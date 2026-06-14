import Link from "next/link";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { UNIVERSITY_CONTENT } from "@/lib/seed/university-content";
import { getAllListings } from "@/lib/data/listings";
import { isNearCampus } from "@/lib/distance";
import { formatPrice } from "@/lib/utils";

interface RailItem {
  id: string;
  shortName: string;
  city: string;
  photo: string;
  count: number;
  fromPrice: number | null;
}

// Wikimedia thumb URLs embed the width, request a rail-sized derivative
// instead of shipping the 1280px hero asset to a 210px card. Only the listed
// thumb buckets exist (250/330/500/960/1280…); off-list widths return 400.
function railPhoto(url: string): string {
  return url.replace("/1280px-", "/500px-");
}

function UniCard({
  item,
  ariaHidden,
}: {
  item: RailItem;
  ariaHidden?: boolean;
}) {
  return (
    <Link
      href={`/universities/${item.id}`}
      className="uni-card"
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
    >
      <div className="photo" style={{ backgroundImage: `url(${item.photo})` }}>
        <span className="name">{item.shortName}</span>
      </div>
      <div className="body">
        <div className="count">
          {item.count > 0
            ? `${item.count} ${item.count === 1 ? "room" : "rooms"} nearby`
            : item.city}
        </div>
        <div className="price">
          {item.fromPrice != null
            ? `From ${formatPrice(item.fromPrice)} /mo`
            : "Campus guide →"}
        </div>
      </div>
    </Link>
  );
}

export async function UniversityRail() {
  // Compute-don't-claim: counts and from-prices are derived from listing
  // coordinates at read, the same numbers the /universities pages show.
  // Photos are the real campus photographs from the guide content.
  const listings = await getAllListings();
  const items: RailItem[] = UNIVERSITIES.flatMap((u) => {
    const content = UNIVERSITY_CONTENT[u.id];
    if (!content) return [];
    const near = listings.filter((l) => isNearCampus(l.lat, l.lng, u.id));
    return [
      {
        id: u.id,
        shortName: u.shortName,
        city: u.city,
        photo: railPhoto(content.photo),
        count: near.length,
        fromPrice: near.length
          ? Math.min(...near.map((l) => l.priceMonthly))
          : null,
      },
    ];
  });

  return (
    <section className="home-container">
      <div className="home-sec-head">
        <div>
          <h2>Browse by university</h2>
          <div className="sub">
            Real campus photos, real distances, every guide computed from
            coordinates.
          </div>
        </div>
        <Link href="/universities" className="more">All universities →</Link>
      </div>
      {/* Marquee: list rendered twice; CSS slides the track -50% on a loop.
          The duplicate set is aria-hidden and unfocusable. */}
      <div className="uni-rail">
        <div className="uni-track">
          {items.map((item) => (
            <UniCard key={item.id} item={item} />
          ))}
          {items.map((item) => (
            <UniCard key={`dup-${item.id}`} item={item} ariaHidden />
          ))}
        </div>
      </div>
    </section>
  );
}
