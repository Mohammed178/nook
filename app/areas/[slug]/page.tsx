import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { localizeVibe } from "@/lib/seed/areas.i18n";
import { AreaMap, type AreaMapListing } from "@/components/areas/area-map";
import { getAreaBySlug } from "@/lib/data/areas";
import { getAllListings } from "@/lib/data/listings";
import { attachListingRelations } from "@/lib/data/listings-relations";
import {
  computeAreaStats,
  amenityLabel,
  type Tally,
} from "@/lib/data/area-stats";
import { AREAS } from "@/lib/seed/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { AREA_CONTENT } from "@/lib/seed/area-content";
import {
  getAreaForecast,
  getForecastMeta,
  projectRent,
} from "@/lib/data/rent-forecast";
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
  const [area, { meta }] = await Promise.all([
    getAreaBySlug(slug),
    getDictionary(),
  ]);
  if (!area) return { title: meta.areaNotFound };
  return {
    title: format(meta.areaTitle, { area: area.name }),
    description: format(meta.areaDesc, { area: area.name, city: area.city }),
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
  const [area, listings, dict, locale] = await Promise.all([
    getAreaBySlug(slug),
    getAllListings(),
    getDictionary(),
    getLocale(),
  ]);
  if (!area) notFound();
  const t = dict.areas;
  const amLabel = (k: string) => t.amenityLabels[k as keyof typeof t.amenityLabels] ?? amenityLabel(k);

  const stats = computeAreaStats(listings, area, UNIVERSITIES);

  // 3-month rent outlook: the model provides a % change per horizon (synthetic
  // panel, wrong absolute scale) which we rebase onto Nook's own median rent for
  // the area. Only shown when the area has both a forecast and a real median.
  const forecastData = getAreaForecast(area.slug);
  const forecast =
    forecastData && stats.medianPrice != null
      ? (() => {
          const base = stats.medianPrice;
          const pct3 = forecastData.pctH3;
          const trend = pct3 > 1 ? "up" : pct3 < -1 ? "down" : "flat";
          return {
            trend,
            pct3,
            change: `${pct3 > 0 ? "+" : ""}${pct3}%`,
            r2: getForecastMeta().testR2.h3,
            base,
            steps: [
              { key: "now", n: 0, rm: base },
              { key: "h1", n: 1, rm: projectRent(base, forecastData.pctH1) },
              { key: "h2", n: 2, rm: projectRent(base, forecastData.pctH2) },
              { key: "h3", n: 3, rm: projectRent(base, forecastData.pctH3) },
            ],
          };
        })()
      : null;

  // Live listings in this area, cheapest first, backs the rooms grid + map.
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

  const localizedVibe = localizeVibe(area.slug, area.vibe, locale);
  const vibes = localizedVibe
    ? localizedVibe.split(/[,،]/).map((v) => v.trim()).filter(Boolean)
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
          <nav className="uni-hero-crumb" aria-label={t.breadcrumbAria}>
            <Link href="/areas">{t.breadcrumb}</Link>
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
            {t.photoCredit}
          </a>
        )}
      </header>

      <div className="container uni-detail">
        <dl className="uni-facts">
          <div className="uf">
            <dt>{t.liveRooms}</dt>
            <dd>{stats.liveCount}</dd>
          </div>
          {stats.fromPrice != null && (
            <div className="uf">
              <dt>{t.roomsFrom}</dt>
              <dd>
                {formatPrice(stats.fromPrice)}
                <span className="per">{t.perMonth}</span>
              </dd>
            </div>
          )}
          {stats.medianPrice != null && (
            <div className="uf">
              <dt>{t.medianRent}</dt>
              <dd>
                {formatPrice(stats.medianPrice)}
                <span className="per">{t.perMonth}</span>
              </dd>
            </div>
          )}
          {stats.nearbyCampuses[0] && (
            <div className="uf">
              <dt>{t.nearestCampusFact}</dt>
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
                {forecast && (
                  <section
                    className="uni-section area-forecast"
                    data-trend={forecast.trend}
                  >
                    <div className="area-forecast-head">
                      <h2>{t.forecast.heading}</h2>
                      <span
                        className="area-forecast-badge"
                        aria-label={format(t.forecast.headline, {
                          change: forecast.change,
                        })}
                      >
                        {forecast.trend !== "flat" && (
                          <Icon
                            name={
                              forecast.trend === "down"
                                ? "chevron-down"
                                : "chevron-up"
                            }
                            size={13}
                          />
                        )}
                        <span>
                          {forecast.trend === "up"
                            ? t.forecast.rising
                            : forecast.trend === "down"
                              ? t.forecast.falling
                              : t.forecast.steady}
                        </span>
                        <span className="pct tabular force-ltr">
                          {forecast.change}
                        </span>
                      </span>
                    </div>
                    <ol className="area-forecast-steps">
                      {forecast.steps.map((s, i) => (
                        <li
                          key={s.key}
                          className="area-forecast-step"
                          style={{ "--i": i } as React.CSSProperties}
                        >
                          <span className="m">
                            {s.n === 0
                              ? t.forecast.now
                              : format(t.forecast.monthsShort, { n: s.n })}
                          </span>
                          <span className="rm tabular">
                            {formatPrice(s.rm)}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="area-forecast-caption">
                      {format(t.forecast.caption, {
                        price: formatPrice(forecast.base),
                        r2: forecast.r2,
                      })}
                    </p>
                  </section>
                )}

                <section className="uni-section">
                  <h2>{t.theRoomsHere}</h2>
                  <p>
                    {format(t.roomsLiveIntro, {
                      count: stats.liveCount,
                      verb: stats.liveCount === 1 ? t.roomIs : t.roomsAre,
                      area: area.name,
                      range:
                        stats.fromPrice != null && stats.maxPrice != null
                          ? format(t.priceRange, {
                              min: formatPrice(stats.fromPrice),
                              max: formatPrice(stats.maxPrice),
                            })
                          : "",
                    })}
                  </p>

                  <div className="area-insights">
                    <div className="area-metric">
                      <h3>{t.propertyType}</h3>
                      <div className="area-bars">
                        {renderBars(stats.typeMix, (k) => t.typeLabels[k])}
                      </div>
                    </div>
                    <div className="area-metric">
                      <h3>{t.furnishingHeading}</h3>
                      <div className="area-bars">
                        {renderBars(
                          stats.furnishingMix,
                          (k) => t.furnishingLabels[k],
                        )}
                      </div>
                    </div>
                    <div className="area-metric">
                      <h3>{t.whoCanRent}</h3>
                      <div className="area-bars">
                        {renderBars(
                          stats.genderMix,
                          (k) =>
                            t.genderLabels[k as keyof typeof t.genderLabels] ?? k,
                        )}
                      </div>
                    </div>
                    <div className="area-metric">
                      <h3>{t.goodToKnow}</h3>
                      <dl className="area-keyvals">
                        {stats.utilitiesIncludedPct != null && (
                          <div>
                            <dt>{t.utilitiesIncluded}</dt>
                            <dd>
                              {format(t.pctOfRooms, {
                                pct: stats.utilitiesIncludedPct,
                              })}
                            </dd>
                          </div>
                        )}
                        {stats.bedroomsRange && (
                          <div>
                            <dt>{t.bedroomsLabel}</dt>
                            <dd>
                              {stats.bedroomsRange[0] === stats.bedroomsRange[1]
                                ? stats.bedroomsRange[0]
                                : `${stats.bedroomsRange[0]}–${stats.bedroomsRange[1]}`}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt>{t.availableNow}</dt>
                          <dd>
                            {format(t.availableOf, {
                              available: stats.availableCount,
                              total: stats.liveCount,
                            })}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {stats.topAmenities.length > 0 && (
                    <div className="area-amenities">
                      <h3>{t.commonAmenities}</h3>
                      <ul className="area-chips">
                        {stats.topAmenities.map((a) => (
                          <li key={a.key} className="area-chip">
                            {amLabel(a.key)}
                            <span className="c">{a.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                {mapListings.length > 0 && (
                  <section className="uni-section">
                    <h2>{t.whereRoomsAre}</h2>
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
                <h2>{t.theRoomsHere}</h2>
                <div className="uni-empty">
                  <p>{format(t.noRoomsLive, { area: area.name })}</p>
                  <Link href="/listings" className="btn btn-secondary">
                    {t.browseAllKV}
                  </Link>
                </div>
              </section>
            )}
          </div>

          <aside className="campus-rail">
            {stats.nearbyCampuses.length > 0 && (
              <section className="campus-rail-block">
                <h2>{t.nearestCampuses}</h2>
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
                {format(t.browseRoomsIn, {
                  count: stats.liveCount,
                  roomsWord: stats.liveCount === 1 ? t.roomWord : t.roomsWord,
                  area: area.name,
                })}
              </Link>
            )}
          </aside>
        </div>

        {top.length > 0 && (
          <section className="uni-section uni-rooms">
            <div className="section-h">
              <h2>{format(t.roomsInArea, { area: area.name })}</h2>
              <Link href={`/listings?area=${area.slug}`} className="more">
                {t.browseAll}
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
                    card={dict.card}
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
