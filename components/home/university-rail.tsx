import Link from "next/link";
import { getUniversityRail } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";

function UniCard({
  item,
  ariaHidden,
}: {
  item: ReturnType<typeof getUniversityRail>[number];
  ariaHidden?: boolean;
}) {
  return (
    <Link
      href={`/listings?universityId=${item.universityId}`}
      className="uni-card"
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
    >
      <div className="photo" style={{ backgroundImage: `url(${item.photoUrl})` }}>
        <span className="name">{item.displayName}</span>
      </div>
      <div className="body">
        <div className="count">{item.listingCount.toLocaleString()} rooms</div>
        <div className="price">From {formatPrice(item.fromPriceMonthly)} /mo</div>
      </div>
    </Link>
  );
}

export function UniversityRail() {
  const items = getUniversityRail();
  return (
    <section className="home-container">
      <div className="home-sec-head">
        <div>
          <h2>Browse by university</h2>
          <div className="sub">Rooms within walking, KTM, or short Grab distance of campus.</div>
        </div>
        <Link href="/universities" className="more">All universities →</Link>
      </div>
      {/* Marquee: list rendered twice; CSS slides the track -50% on a loop.
          The duplicate set is aria-hidden and unfocusable. */}
      <div className="uni-rail">
        <div className="uni-track">
          {items.map((item) => (
            <UniCard key={item.universityId} item={item} />
          ))}
          {items.map((item) => (
            <UniCard key={`dup-${item.universityId}`} item={item} ariaHidden />
          ))}
        </div>
      </div>
    </section>
  );
}
