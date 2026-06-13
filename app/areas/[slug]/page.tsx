import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { AreaMap, type AreaMapListing } from "@/components/areas/area-map";
import { getAreaBySlug } from "@/lib/data/areas";
import { getAllListings } from "@/lib/data/listings";
import { attachListingRelations } from "@/lib/data/listings-relations";
import {
  computeAreaStats,
  TYPE_LABEL,
  FURNISHING_LABEL,
  GENDER_LABEL,
  amenityLabel,
  type Tally,
} from "@/lib/data/area-stats";
import { AREAS } from "@/lib/seed/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { AREA_CONTENT } from "@/lib/seed/area-content";
import { formatPrice } from "@/lib/utils";

export function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = await getAreaBySlug(slug);
  if (!area) return { title: "Area not found · Nook" };
  return {
    title: `Student rooms in ${area.name} · Nook`,
    description: `Live room counts, typical rents and nearby campuses for ${area.name}, ${area.city} — computed from current Nook listings.`,
  };
}

// A horizontal share bar for a tally row: track width = count / total.
function Bar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="area-bar-row">
      <span className="area-bar-label">{label}</span>
      <span className="area-bar-track" aria-hidden="true">
        <span className="area-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="area-bar-val">{count}</span>
    </div>
  );
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [area, listings] = await Promise.all([
    getAreaBySlug(slug),
    getAllListings(),
  ]);
  if (!area) notFound();

  const stats = computeAreaStats(listings, area, UNIVERSITIES);

  // Live listings in this area, cheapest first — backs the rooms grid + map.
  const areaListings = listings
    .filter(
      (l) => l.areaId === area.id && l.status !== "draft" && !l.deletedAt,
    )
    .sort((a, b) => a.priceMonthly - b.priceMonthly);

  const top = await attachListingRelations(areaListings.slice(0, 6));

  const mapListings: AreaMapListing[] = areaListings
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      lat: l.lat!,
      lng: l.lng!,
      priceMonthly: l.priceMonthly,
    }));

  const vibes = area.vibe
    ? area.vibe.split(",").map((v) => v.trim()).filter(Boolean)
    : [];
  const content = AREA_CONTENT[area.slug];

  const renderBars = <T extends string>(
    rows: Tally<T>[],
    label: (k: T) => string,
  ) =>
    rows.map((r) => (
      <Bar
        key={r.key}
        label={label(r.key)}
        count={r.count}
        total={stats.liveCount}
      />
    ));

  return (
    <>
      <Navbar active="areas" />

      <header
        className={`uni-hero${content ? "" : " area-hero-flat"}`}
        style={
          content
            ? ({ "--uni-hero-bg": `url(${content.photo})` } as React.CSSProperties)
            : undefined
        }
      >
        <div className="uni-hero-inner">
          <nav className="uni-hero-crumb" aria-label="Breadcrumb">
            <Link href="/areas">Areas</Link>
            <span aria-hidden="true">/</span>
            <span>{area.name}</span>
          </nav>
          <h1>{area.name}</h1>
          <div className="uni-hero-tags">
            <span className="loc">
              <Icon name="pin" size={12} />
              {area.city}, {area.state}
            </span>
            {vibes.map((v) => (
              <span key={v} className="type">
                {v}
              </span>
            ))}
          </div>
        </div>
        {content && (
          <a
            className="uni-hero-credit"
            href={`https://commons.wikimedia.org/wiki/File:${content.photoFile}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Photo: Wikimedia Commons
          </a>
        )}
      </header>

      <div className="container uni-detail">
        <dl className="uni-facts">
          <div className="uf">
            <dt>Live rooms</dt>
            <dd>{stats.liveCount}</dd>
          </div>
          {stats.fromPrice != null && (
            <div className="uf">
              <dt>Rooms from</dt>
              <dd>
                {formatPrice(stats.fromPrice)}
                <span className="per">/mo</span>
              </dd>
            </div>
          )}
          {stats.medianPrice != null && (
            <div className="uf">
              <dt>Median rent</dt>
              <dd>
                {formatPrice(stats.medianPrice)}
                <span className="per">/mo</span>
              </dd>
            </div>
          )}
          {stats.nearbyCampuses[0] && (
            <div className="uf">
              <dt>Nearest campus</dt>
              <dd>
                {stats.nearbyCampuses[0].shortName}
                <span className="per">
                  {" "}
                  {stats.nearbyCampuses[0].km.toFixed(1)} km
                </span>
              </dd>
            </div>
          )}
        </dl>

        <div className="uni-body">
          <div className="uni-main">
            {stats.liveCount > 0 ? (
              <>
                <section className="uni-section">
                  <h2>The rooms here</h2>
                  <p>
                    {stats.liveCount}{" "}
                    {stats.liveCount === 1 ? "room is" : "rooms are"} live in{" "}
                    {area.name} right now
                    {stats.fromPrice != null && stats.maxPrice != null
                      ? `, ${formatPrice(stats.fromPrice)}–${formatPrice(stats.maxPrice)}/mo`
                      : ""}
                    . Everything below is counted from those listings.
                  </p>

                  <div className="area-insights">
                    <div className="area-metric">
                      <h3>Property type</h3>
                      <div className="area-bars">
                        {renderBars(stats.typeMix, (k) => TYPE_LABEL[k])}
                      </div>
                    </div>
                    <div className="area-metric">
                      <h3>Furnishing</h3>
                      <div className="area-bars">
                        {renderBars(
                          stats.furnishingMix,
                          (k) => FURNISHING_LABEL[k],
                        )}
                      </div>
                    </div>
                    <div className="area-metric">
                      <h3>Who can rent</h3>
                      <div className="area-bars">
                        {renderBars(stats.genderMix, (k) => GENDER_LABEL[k] ?? k)}
                      </div>
                    </div>
                    <div className="area-metric">
                      <h3>Good to know</h3>
                      <dl className="area-keyvals">
                        {stats.utilitiesIncludedPct != null && (
                          <div>
                            <dt>Utilities included</dt>
                            <dd>{stats.utilitiesIncludedPct}% of rooms</dd>
                          </div>
                        )}
                        {stats.bedroomsRange && (
                          <div>
                            <dt>Bedrooms</dt>
                            <dd>
                              {stats.bedroomsRange[0] === stats.bedroomsRange[1]
                                ? stats.bedroomsRange[0]
                                : `${stats.bedroomsRange[0]}–${stats.bedroomsRange[1]}`}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt>Available now</dt>
                          <dd>
                            {stats.availableCount} of {stats.liveCount}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {stats.topAmenities.length > 0 && (
                    <div className="area-amenities">
                      <h3>Common amenities</h3>
                      <ul className="area-chips">
                        {stats.topAmenities.map((a) => (
                          <li key={a.key} className="area-chip">
                            {amenityLabel(a.key)}
                            <span className="c">{a.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                {mapListings.length > 0 && (
                  <section className="uni-section">
                    <h2>Where the rooms are</h2>
                    <AreaMap
                      name={area.name}
                      label={area.name}
                      lat={area.lat}
                      lng={area.lng}
                      listings={mapListings}
                    />
                  </section>
                )}
              </>
            ) : (
              <section className="uni-section">
                <h2>The rooms here</h2>
                <div className="uni-empty">
                  <p>
                    No rooms are live in {area.name} right now. New listings here
                    appear the day an agent publishes them — meanwhile the
                    nearby campuses and the rest of the Klang Valley are a click
                    away.
                  </p>
                  <Link href="/listings" className="btn btn-secondary">
                    Browse all Klang Valley rooms
                  </Link>
                </div>
              </section>
            )}
          </div>

          <aside className="campus-rail">
            {stats.nearbyCampuses.length > 0 && (
              <section className="campus-rail-block">
                <h2>Nearest campuses</h2>
                <ul className="uni-area-list">
                  {stats.nearbyCampuses.map((c) => (
                    <li key={c.uniId}>
                      <Link
                        href={`/universities/${c.uniId}`}
                        className="uni-area-row"
                      >
                        <span className="name">{c.shortName}</span>
                        <span className="vibe">{c.name}</span>
                        <span className="arrow tabular" aria-hidden="true">
                          {c.km.toFixed(1)} km
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {stats.liveCount > 0 && (
              <Link
                href={`/listings?area=${area.slug}`}
                className="btn btn-primary btn-lg campus-rail-cta"
              >
                Browse {stats.liveCount}{" "}
                {stats.liveCount === 1 ? "room" : "rooms"} in {area.name}
              </Link>
            )}
          </aside>
        </div>

        {top.length > 0 && (
          <section className="uni-section uni-rooms">
            <div className="section-h">
              <h2>Rooms in {area.name}</h2>
              <Link href={`/listings?area=${area.slug}`} className="more">
                Browse all →
              </Link>
            </div>
            <div className="uni-rooms-grid">
              {top.map((item, i) => (
                <div
                  key={item.listing.id}
                  className="uni-room-rise"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <ListingCard
                    listing={item.listing}
                    agent={item.agent}
                    area={item.area}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
