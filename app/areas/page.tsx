import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { getAllAreas } from "@/lib/data/areas";
import { getAllListings } from "@/lib/data/listings";
import { computeAllAreaStats } from "@/lib/data/area-stats";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { AREA_CONTENT } from "@/lib/seed/area-content";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Areas · Nook",
  description:
    "Every Klang Valley neighbourhood students rent in, live room counts, typical rents, and the campuses each one is closest to, all computed from current listings.",
};

// Mosaic spans on the 6-column grid (12 areas). Rows resolve to
// [4+2][3+3][2+2+2][2+2+2][4+2], the busiest area (stats are count-sorted)
// lands on the opening 4-span tile.
const SPANS = [4, 2, 3, 3, 2, 2, 2, 2, 2, 2, 4, 2];

export default async function AreasPage() {
  const [areas, listings] = await Promise.all([
    getAllAreas(),
    getAllListings(),
  ]);
  const stats = computeAllAreaStats(listings, areas, UNIVERSITIES);
  const totalRooms = stats.reduce((n, s) => n + s.liveCount, 0);

  return (
    <>
      <Navbar active="areas" />

      <div className="container uni-index">
        <header className="uni-index-head">
          <div>
            <div className="kicker">Neighbourhoods</div>
            <h1>
              Where students
              <br />
              actually rent.
            </h1>
          </div>
          <p className="dek">
            {areas.length} Klang Valley areas, {totalRooms} live rooms between
            them. Every count, rent, and campus distance below is computed from
            current listings, never a claim.
          </p>
        </header>

        {/* At-a-glance: the analytical overview, busiest areas first. */}
        <section className="area-board" aria-label="Areas at a glance">
          <div className="area-board-head" aria-hidden="true">
            <span>Area</span>
            <span className="num">Rooms</span>
            <span className="num">From</span>
            <span>Nearest campus</span>
          </div>
          <ul>
            {stats.map((s) => {
              const nearest = s.nearbyCampuses[0];
              return (
                <li key={s.area.id} className="area-board-row">
                  <span className="name">
                    {s.area.name}
                    <span className="sub">{s.area.city}</span>
                  </span>
                  <span className="num">{s.liveCount}</span>
                  <span className="num">
                    {s.fromPrice != null ? formatPrice(s.fromPrice) : "-"}
                  </span>
                  <span className="campus">
                    {nearest
                      ? `${nearest.shortName} · ${nearest.km.toFixed(1)} km`
                      : "-"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <ul className="uni-mosaic">
          {stats.map((s, i) => {
            const nearest = s.nearbyCampuses[0];
            const photo = AREA_CONTENT[s.area.slug]?.photo;
            return (
              <li
                key={s.area.id}
                className={`uni-tile u-span-${SPANS[i] ?? 2}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <Link href={`/areas/${s.area.slug}`} className="uni-tile-link">
                  <div
                    className="uni-tile-photo"
                    role="img"
                    aria-label={s.area.name}
                    style={
                      photo ? { backgroundImage: `url(${photo})` } : undefined
                    }
                  >
                    {nearest && (
                      <span className="uni-tile-type">
                        {nearest.shortName} · {nearest.km.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div className="uni-tile-body">
                    <h2>{s.area.name}</h2>
                    <div className="loc">
                      <Icon name="pin" size={12} />
                      {s.area.city}, {s.area.state}
                    </div>
                    <div className="meta">
                      <span className="v">
                        {s.liveCount === 0
                          ? "No rooms yet"
                          : `${s.liveCount} ${s.liveCount === 1 ? "room" : "rooms"}`}
                      </span>
                      {s.fromPrice != null && (
                        <span className="v">from {formatPrice(s.fromPrice)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
