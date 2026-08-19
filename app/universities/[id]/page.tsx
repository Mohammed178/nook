import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { localizeUniversityContent } from "@/lib/seed/university-content.i18n";
import {
  UniversityMap,
  type UniMapListing,
} from "@/components/universities/university-map";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { getUniversityBySlug } from "@/lib/data/universities";
import { getAllListings } from "@/lib/data/listings";
import { getAllAreas } from "@/lib/data/areas";
import { attachListingRelations } from "@/lib/data/listings-relations";
import { haversineKm, NEAR_CAMPUS_RADIUS_KM } from "@/lib/distance";
import { formatPrice } from "@/lib/utils";

export function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ id: u.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [uni, { meta }, locale] = await Promise.all([
    getUniversityBySlug(id),
    getDictionary(),
    getLocale(),
  ]);
  if (!uni) return { title: meta.universityNotFound };
  return {
    title: format(meta.universityTitle, { uni: uni.shortName }),
    description: localizeUniversityContent(id, uni, locale).description.slice(
      0,
      160,
    ),
  };
}

const formatStudents = new Intl.NumberFormat("en-MY");

export default async function UniversityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uni = await getUniversityBySlug(id);
  if (!uni) notFound();
  const content = uni;

  // Compute-don't-claim (4c-B2): every number on this page derives from
  // coordinates at read, room count, from-price, per-listing km. Nothing here
  // is an agent-entered claim.
  const [listings, areas, dict, locale] = await Promise.all([
    getAllListings(),
    getAllAreas(),
    getDictionary(),
    getLocale(),
  ]);
  const t = dict.universities;
  const lc = localizeUniversityContent(id, content, locale);

  const near = listings
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      listing: l,
      km: haversineKm(l.lat!, l.lng!, uni.lat, uni.lng),
    }))
    .filter((x) => x.km <= NEAR_CAMPUS_RADIUS_KM)
    .sort((a, b) => a.km - b.km);

  const fromPrice =
    near.length > 0
      ? Math.min(...near.map((x) => x.listing.priceMonthly))
      : null;

  const top = await attachListingRelations(near.slice(0, 4).map((x) => x.listing));

  const mapListings: UniMapListing[] = near.map(({ listing }) => ({
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    lat: listing.lat!,
    lng: listing.lng!,
    priceMonthly: listing.priceMonthly,
  }));

  // Student areas associated with this campus (areas.nearby_university_ids,
  // an area↔campus association, distinct from the dropped listing-level tags).
  const studentAreas = areas.filter((a) => a.nearbyUniversityIds.includes(id));

  return (
    <>
      <Navbar active="universities" />

      <header
        className="uni-hero"
        style={{ "--uni-hero-bg": `url(${content.photo})` } as React.CSSProperties}
      >
        <div className="uni-hero-inner">
          <nav className="uni-hero-crumb" aria-label={t.breadcrumbAria}>
            <Link href="/universities">{t.breadcrumb}</Link>
            <span aria-hidden="true">/</span>
            <span>{uni.shortName}</span>
          </nav>
          <h1>{uni.name}</h1>
          <div className="uni-hero-tags">
            <span className="loc">
              <Icon name="pin" size={12} />
              {uni.city}, {uni.state}
            </span>
            {uni.campusType && (
              <span className="type">
                {uni.campusType === "public" ? t.publicUni : t.privateUni}
              </span>
            )}
          </div>
        </div>
        <a
          className="uni-hero-credit"
          href={`https://commons.wikimedia.org/wiki/File:${content.photoFile}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.photoCredit}
        </a>
      </header>

      <div className="container uni-detail">
        <dl className="uni-facts">
          {uni.studentCount != null && (
            <div className="uf">
              <dt>{t.studentsLabel}</dt>
              <dd>{formatStudents.format(uni.studentCount)}</dd>
            </div>
          )}
          <div className="uf">
            <dt>{format(t.roomsWithin, { radius: NEAR_CAMPUS_RADIUS_KM })}</dt>
            <dd>{near.length}</dd>
          </div>
          {fromPrice != null && (
            <div className="uf">
              <dt>{t.roomsFrom}</dt>
              <dd>
                {formatPrice(fromPrice)}
                <span className="per">{t.perMonth}</span>
              </dd>
            </div>
          )}
        </dl>

        <div className="uni-body">
          <div className="uni-main">
            <section className="uni-section">
              <h2>{t.aboutCampus}</h2>
              <p>{lc.description}</p>
              <ul className="uni-feature-list">
                {lc.campusFeatures.map((f) => (
                  <li key={f}>
                    <span className="ico">
                      <Icon name="check" size={14} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <section className="uni-section">
              <h2>{t.gettingThere}</h2>
              <ul className="uni-feature-list">
                {lc.transit.map((line) => (
                  <li key={line}>
                    <span className="ico">
                      <Icon name="train" size={14} />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            <section className="uni-section">
              <h2>{t.campusAndRooms}</h2>
              <UniversityMap
                name={uni.name}
                shortName={uni.shortName}
                lat={uni.lat}
                lng={uni.lng}
                radiusKm={NEAR_CAMPUS_RADIUS_KM}
                listings={mapListings}
              />
            </section>
          </div>

          <aside className="campus-rail">
            {studentAreas.length > 0 && (
              <section className="campus-rail-block">
                <h2>{t.whereStudentsLive}</h2>
                <ul className="uni-area-list">
                  {studentAreas.map((a) => (
                    <li key={a.id}>
                      <Link href={`/listings?area=${a.slug}`} className="uni-area-row">
                        <span className="name">{a.name}</span>
                        {a.vibe && <span className="vibe">{a.vibe}</span>}
                        <span className="arrow" aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="campus-rail-block">
              <h2>{t.officialSite}</h2>
              <a
                className="campus-rail-site"
                href={content.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.website.replace("https://", "")}
              </a>
            </section>

            {near.length > 0 && (
              <Link
                href={`/listings?university=${uni.slug}`}
                className="btn btn-primary btn-lg campus-rail-cta"
              >
                {format(t.browseRoomsNear, {
                  count: near.length,
                  roomsWord: near.length === 1 ? t.roomWord : t.roomsWord,
                  uni: uni.shortName,
                })}
              </Link>
            )}
          </aside>
        </div>

        <section className="uni-section uni-rooms">
          <div className="section-h">
            <h2>{format(t.closestRooms, { uni: uni.shortName })}</h2>
            {near.length > 0 && (
              <Link href={`/listings?university=${uni.slug}`} className="more">
                {t.browseAll}
              </Link>
            )}
          </div>
          {top.length > 0 ? (
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
                    locale={locale}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="uni-empty">
              <p>
                {format(t.noRoomsWithin, {
                  radius: NEAR_CAMPUS_RADIUS_KM,
                  uni: uni.shortName,
                })}
              </p>
              <Link href="/listings" className="btn btn-secondary">
                {t.browseAllKV}
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
