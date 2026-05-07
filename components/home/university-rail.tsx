import Link from "next/link";
import { getUniversityRail } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";

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
      <div className="uni-rail">
        {items.map((item) => (
          <Link
            key={item.universityId}
            href={`/listings?universityId=${item.universityId}`}
            className="uni-card"
          >
            <div
              className="photo"
              style={{ backgroundImage: `url(${item.photoUrl})` }}
            >
              <span className="name">{item.displayName}</span>
            </div>
            <div className="body">
              <div className="count">{item.listingCount.toLocaleString()} rooms</div>
              <div className="price">From {formatPrice(item.fromPriceMonthly)} /mo</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
