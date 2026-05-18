import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { HeartButton } from "@/components/nook/heart-button";
import { Gallery } from "@/components/listings/gallery";
import { PhoneReveal } from "@/components/listings/phone-reveal";
import { ViewTracker } from "@/components/listings/view-tracker";
import { LISTINGS } from "@/lib/seed/listings";
import { getFavouriteIds } from "@/lib/favourites";
import { getCurrentUser } from "@/lib/auth";
import { getAgentBySlug } from "@/lib/data/agents";
import { getAreaBySlug } from "@/lib/data/areas";
import {
  agentSlugForLegacyId,
  areaSlugForLegacyId,
} from "@/lib/data/legacy-id-bridge";
import { attachListingRelations } from "@/lib/data/listings-relations";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { REVIEWS_BY_AGENT } from "@/lib/seed/reviews";
import { NEARBY_BY_AREA } from "@/lib/seed/nearby";
import { amenitySpec } from "@/lib/amenities";
import { formatPrice } from "@/lib/utils";
import {
  parseListingSearchParams,
  preserveQueryString,
  getSimilarListings,
  type RawSearchParams,
} from "@/lib/listings-search";
import type { Listing, NearbyPOI, NearbyPOIKind } from "@/lib/types";

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = LISTINGS.find((l) => l.slug === slug);
  if (!listing) return { title: "Listing not found · Nook" };
  return {
    title: `${listing.title} · Nook`,
    description: listing.description.split("\n\n")[0]?.slice(0, 160),
  };
}

const POI_ICON_BY_KIND: Record<NearbyPOIKind, "school" | "train" | "bag" | "park" | "shield" | "kitchen"> = {
  uni: "school",
  train: "train",
  mall: "bag",
  mart: "bag",
  park: "park",
  hospital: "shield",
  food: "kitchen",
};

const POI_DOT_CLASS_BY_KIND: Record<NearbyPOIKind, string> = {
  uni: "",
  train: " train",
  mall: " mall",
  mart: " mall",
  park: "",
  hospital: "",
  food: "",
};

function formatDistance(metres: number): string {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function withinBudgetCopy(price: number, max: number): string {
  const diff = max - price;
  if (diff <= 0) return "";
  return `Within budget · ${formatPrice(diff)} below your ${formatPrice(max)} cap`;
}

function pickPrimaryUni(listing: Listing) {
  return listing.nearbyUniversityIds[0]
    ? UNIVERSITY_BY_ID[listing.nearbyUniversityIds[0]]
    : undefined;
}

const POI_POSITIONS: { left: string; top: string }[] = [
  { left: "30%", top: "40%" },
  { left: "72%", top: "30%" },
  { left: "68%", top: "70%" },
  { left: "28%", top: "78%" },
];

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const listing = LISTINGS.find((l) => l.slug === slug);
  if (!listing) notFound();

  const parsed = parseListingSearchParams(sp);
  const currentQuery = preserveQueryString(sp);

  const [savedIds, user] = await Promise.all([getFavouriteIds(), getCurrentUser()]);
  const signedIn = user !== null;
  const initialSaved = savedIds.includes(listing.id);

  const agentSlug = agentSlugForLegacyId(listing.agentId);
  const areaSlug = areaSlugForLegacyId(listing.areaId);
  const [agent, area] = await Promise.all([
    agentSlug ? getAgentBySlug(agentSlug) : Promise.resolve(null),
    areaSlug ? getAreaBySlug(areaSlug) : Promise.resolve(null),
  ]);
  const primaryUni = pickPrimaryUni(listing);
  const reviews = (REVIEWS_BY_AGENT[listing.agentId] ?? []).slice(0, 3);
  const nearby: NearbyPOI[] = NEARBY_BY_AREA[listing.areaId] ?? [];
  const mapPois = nearby.slice(0, POI_POSITIONS.length);
  const similarListings = getSimilarListings(listing, 4);
  const similar = await attachListingRelations(similarListings);

  const paragraphs = listing.description.split("\n\n").filter(Boolean);
  const withinBudget =
    parsed.priceMax != null && listing.priceMonthly <= parsed.priceMax
      ? withinBudgetCopy(listing.priceMonthly, parsed.priceMax)
      : "";

  const distanceLabel = listing.metresToCampus != null
    ? `${formatDistance(listing.metresToCampus)} to ${primaryUni?.shortName ?? "campus"} gate`
    : null;

  return (
    <>
      <Navbar active="listings" />
      <ViewTracker listingId={listing.id} />

      <div className="breadcrumb">
        <Link href="/">Nook</Link>
        <span>›</span>
        <Link href="/listings">{listing.state}</Link>
        <span>›</span>
        <Link href={`/listings?area=${listing.areaId}`}>{area?.name ?? listing.city}</Link>
        <span>›</span>
        <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>{listing.title}</span>
      </div>

      <Gallery photos={listing.photos} title={listing.title} />

      <div className="detail-layout">
        <div className="detail-main">
          <div className="title-row">
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {agent?.verified && (
                  <span className="pill pill-verified">
                    <Icon name="check" size={10} /> Verified agent
                  </span>
                )}
                {listing.listedToday && (
                  <span className="pill pill-today">Listed today</span>
                )}
              </div>
              <h1>{listing.title}</h1>
              <div className="addr">
                <Icon name="pin" size={12} />
                {listing.address}, {area?.name ?? listing.city}, {listing.state}
                {distanceLabel ? ` · ${distanceLabel}` : ""}
              </div>
            </div>
            <div className="title-actions">
              <HeartButton
                listingId={listing.id}
                initialSaved={initialSaved}
                signedIn={signedIn}
                variant="icon"
              />
              <button type="button" className="btn btn-icon" aria-label="Share">
                <Icon name="share" size={16} />
              </button>
            </div>
          </div>

          <div className="price-block">
            <div className="price-amt">
              {formatPrice(listing.priceMonthly)}
              <span className="per">/mo</span>
            </div>
            {withinBudget && (
              <span className="pill pill-within pill-lg">{withinBudget}</span>
            )}
          </div>

          <div className="quick-facts">
            <div className="qf">
              <div className="qf-icon"><Icon name="bed" size={20} /></div>
              <div className="qf-val">{listing.bedrooms}</div>
              <div className="qf-lab">{listing.bedrooms === 1 ? "Bedroom" : "Bedrooms"}</div>
            </div>
            <div className="qf">
              <div className="qf-icon"><Icon name="bath" size={20} /></div>
              <div className="qf-val">{listing.bathrooms}</div>
              <div className="qf-lab">{listing.bathrooms === 1 ? "Bathroom" : "Bathrooms"}</div>
            </div>
            <div className="qf">
              <div className="qf-icon"><Icon name="sqft" size={20} /></div>
              <div className="qf-val">{listing.sizeSqft ?? "—"}</div>
              <div className="qf-lab">Sq ft</div>
            </div>
            <div className="qf">
              <div className="qf-icon"><Icon name="check" size={20} /></div>
              <div className="qf-val">
                {listing.furnishing === "full"
                  ? "Yes"
                  : listing.furnishing === "partial"
                    ? "Partial"
                    : "No"}
              </div>
              <div className="qf-lab">Furnished</div>
            </div>
            <div className="qf">
              <div className="qf-icon"><Icon name="school" size={20} /></div>
              <div className="qf-val">
                {listing.metresToCampus != null
                  ? formatDistance(listing.metresToCampus)
                  : "—"}
              </div>
              <div className="qf-lab">to {primaryUni?.shortName ?? "campus"}</div>
            </div>
          </div>

          <div className="section description">
            <h2>About this {listing.type}</h2>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="section">
            <h2>What&apos;s included</h2>
            <div className="amenities">
              {listing.amenities.map((slug) => {
                const spec = amenitySpec(slug);
                return (
                  <div key={slug} className="amenity">
                    <span className="ico"><Icon name={spec.icon} size={14} /></span>
                    {spec.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section">
            <h2>Location</h2>
            <div className="detail-map">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 10 70 Q 20 50 35 55 Q 45 60 40 80 Q 25 90 10 80 Z" fill="#D4E2C8" opacity="0.6" />
                <path d="M 0 50 L 100 48" stroke="#fff" strokeWidth="0.7" />
                <path d="M 50 0 L 50 100" stroke="#fff" strokeWidth="0.6" />
                <path d="M 0 25 Q 50 30 100 22" stroke="#fff" strokeWidth="0.4" />
                <path d="M 0 75 Q 40 72 100 78" stroke="#fff" strokeWidth="0.4" />
              </svg>
              <div className="radius-circle" />
              <div className="center-pin">
                <div className="center-pin-marker" />
              </div>
              {mapPois.map((p, i) => (
                <div
                  key={p.name}
                  className="poi"
                  style={POI_POSITIONS[i]}
                >
                  <div className={`poi-dot${POI_DOT_CLASS_BY_KIND[p.kind]}`} />
                  <div className="poi-label">
                    {p.name} ({formatDistance(p.distanceMetres)})
                  </div>
                </div>
              ))}
            </div>
            <div className="nearby-list">
              {nearby.map((p) => (
                <div key={p.name} className="nearby">
                  <span className="ico">
                    <Icon name={POI_ICON_BY_KIND[p.kind]} size={14} />
                  </span>
                  {p.name}
                  <span className="dist">{formatDistance(p.distanceMetres)}</span>
                </div>
              ))}
            </div>
          </div>

          {agent && reviews.length > 0 && (
            <div className="section">
              <h2>About this agent</h2>
              <div className="review-rail">
                {reviews.map((r) => (
                  <div key={r.id} className="review-card">
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n > r.rating ? "empty" : ""}>
                          <Icon name="star" size={14} />
                        </span>
                      ))}
                    </div>
                    <div className="review-body">{r.comment}</div>
                    <div className="review-foot">
                      <span>—</span>
                      <strong>{r.reviewerName}</strong>
                      <span>·</span>
                      <span>{r.date}</span>
                    </div>
                  </div>
                ))}
              </div>
              {agent.reviewCount > reviews.length && (
                <a
                  href="#"
                  style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}
                >
                  See all {agent.reviewCount} reviews →
                </a>
              )}
            </div>
          )}

          {similar.length > 0 && (
            <div className="section">
              <h2>Similar rooms</h2>
              <div className="similar-grid">
                {similar.map((item) => (
                  <ListingCard
                    key={item.listing.id}
                    listing={item.listing}
                    agent={item.agent}
                    area={item.area}
                    currentQuery={currentQuery}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="sidebar">
          {agent && (
            <div className="agent-panel">
              <div className="agent-head">
                <div className="agent-avatar-md">{initials(agent.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="agent-meta-name">
                    {agent.name}
                    {agent.verified && (
                      <span className="verif" title="BOVAEP-licensed">
                        <Icon name="check-circle" size={14} />
                      </span>
                    )}
                  </div>
                  {agent.agency && (
                    <div className="agent-meta-agency">{agent.agency}</div>
                  )}
                  {agent.bovaepLicence && (
                    <div className="agent-meta-license">
                      BOVAEP {agent.bovaepLicence}
                    </div>
                  )}
                  <div className="agent-meta-rating">
                    <span className="star"><Icon name="star" size={12} /></span>
                    <strong style={{ color: "var(--ink-900)" }}>
                      {agent.rating.toFixed(1)}
                    </strong>
                    <span style={{ color: "var(--ink-500)" }}>
                      · {agent.reviewCount} reviews
                    </span>
                  </div>
                </div>
              </div>

              <div className="reveal-row">
                <PhoneReveal phone={agent.phone ?? agent.whatsapp} />
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp"
                    style={{ flex: 1 }}
                  >
                    <Icon name="whatsapp" size={16} /> WhatsApp
                  </a>
                  <a
                    href={`tel:${(agent.phone ?? agent.whatsapp).replace(/\s/g, "")}`}
                    className="btn btn-call"
                    style={{ flex: 1 }}
                  >
                    <Icon name="phone" size={16} /> Call
                  </a>
                </div>
              </div>

              <div className="trust-list">
                <div className="trust-item">
                  <span className="ico"><Icon name="check" size={14} /></span>
                  Identity verified by Nook
                </div>
                {agent.verified && (
                  <div className="trust-item">
                    <span className="ico"><Icon name="check" size={14} /></span>
                    BOVAEP licence checked against LPEPH
                  </div>
                )}
                <div className="trust-item">
                  <span className="ico"><Icon name="check" size={14} /></span>
                  Responds within {agent.responseTimeMins} minutes · avg
                </div>
                <div className="trust-item">
                  <span className="ico"><Icon name="check" size={14} /></span>
                  No deposit fraud reports
                </div>
              </div>
            </div>
          )}

          <div className="heads-up">
            <strong>Heads up</strong>
            Nook never holds your deposit. Always view in person, sign a written
            tenancy, and pay only the licensed agent listed above.{" "}
            <a href="#">Read our renter safety guide →</a>
          </div>
        </aside>
      </div>

      {agent && (
        <div className="mobile-cta-bar" role="region" aria-label="Contact agent">
          <a
            href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
          >
            <Icon name="whatsapp" size={16} /> WhatsApp
          </a>
          <a
            href={`tel:${(agent.phone ?? agent.whatsapp).replace(/\s/g, "")}`}
            className="btn btn-call"
          >
            <Icon name="phone" size={16} /> Call
          </a>
        </div>
      )}
    </>
  );
}
