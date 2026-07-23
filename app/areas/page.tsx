import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { getAllAreas } from "@/lib/data/areas";
import { getAllListings } from "@/lib/data/listings";
import { computeAllAreaStats } from "@/lib/data/area-stats";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { AREA_CONTENT } from "@/lib/seed/area-content";
import { getAreaForecast } from "@/lib/data/rent-forecast";
import { formatPrice } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.areas };
}

// Mosaic spans on the 6-column grid (12 areas). Rows resolve to
// [4+2][3+3][2+2+2][2+2+2][4+2], the busiest area (stats are count-sorted)
// lands on the opening 4-span tile.
const SPANS = [4, 2, 3, 3, 2, 2, 2, 2, 2, 2, 4, 2];

export default async function AreasPage() {
  const [areas, listings, dict] = await Promise.all([
    getAllAreas(),
    getAllListings(),
    getDictionary(),
  ]);
  const t = dict.areas;
  const stats = computeAllAreaStats(listings, areas, UNIVERSITIES);
  const totalRooms = stats.reduce((n, s) => n + s.liveCount, 0);

  return (
    <>
      <Navbar active="areas" />

      <div className="container uni-index">
        <header className="uni-index-head">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1>
              {t.headline1}
              <br />
              {t.headline2}
            </h1>
          </div>
          <p className="dek">
            {format(t.indexDek, { areas: areas.length, rooms: totalRooms })}
          </p>
        </header>

        <ul className="uni-mosaic">
          {stats.map((s, i) => {
            const nearest = s.nearbyCampuses[0];
            const photo = AREA_CONTENT[s.area.slug]?.photo;
            const fc = getAreaForecast(s.area.slug);
            const fcTrend = fc
              ? Math.abs(fc.pctH3) <= 1
                ? "flat"
                : fc.pctH3 > 0
                  ? "up"
                  : "down"
              : null;
            const fcChange = fc ? `${fc.pctH3 > 0 ? "+" : ""}${fc.pctH3}%` : "";
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
                          ? t.noRoomsYet
                          : format(s.liveCount === 1 ? t.roomCount : t.roomsCount, {
                              count: s.liveCount,
                            })}
                      </span>
                      {s.fromPrice != null && (
                        <span className="v">
                          {format(t.fromPriceShort, {
                            price: formatPrice(s.fromPrice),
                          })}
                        </span>
                      )}
                      {fc && (
                        <span
                          className="area-trend-chip force-ltr"
                          data-trend={fcTrend}
                          aria-label={format(t.forecast.chipAria, {
                            change: fcChange,
                          })}
                        >
                          {fcTrend !== "flat" && (
                            <Icon
                              name={
                                fcTrend === "down"
                                  ? "chevron-down"
                                  : "chevron-up"
                              }
                              size={11}
                            />
                          )}
                          {fcChange}
                        </span>
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
