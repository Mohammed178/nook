import Link from "next/link";
import { Icon } from "./icon";
import { HeartButton } from "./heart-button";
import type { Agent, Area, Listing } from "@/lib/types";
import { isUniversityLister } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { sizedPhotoUrl } from "@/lib/data/_row-mappers";
import { nearestCampus } from "@/lib/distance";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { format } from "@/lib/i18n/config";
import { daysSince, relativeDate } from "@/lib/relative-date";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export type ListingCardVariant =
  | "vertical"
  | "horizontal"
  | "mini"
  | "map"
  | "homepage";

interface ListingCardProps {
  listing: Listing;
  agent: Agent | null;
  area: Area | null;
  card: Dictionary["card"];
  variant?: ListingCardVariant;
  href?: string;
  currentQuery?: string;
  isActive?: boolean;
  initialSaved?: boolean;
  signedIn?: boolean;
  onHeartToggled?: (saved: boolean) => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ListingCard({
  listing,
  agent,
  area,
  card: c,
  variant = "vertical",
  href,
  currentQuery,
  isActive,
  initialSaved = false,
  signedIn = false,
  onHeartToggled,
}: ListingCardProps) {
  const baseHref = href ?? `/listings/${listing.slug}`;
  const linkHref = currentQuery ? `${baseHref}?${currentQuery}` : baseHref;
  // A photoless draft (no listing_photos yet) has no first photo. Guard the
  // background-image so it renders the .is-empty placeholder instead of
  // `url(undefined)` (4c-B1).
  // Widths ≈ 2x the largest CSS size each variant renders the photo at.
  const photoWidth =
    variant === "mini" ? 160 : variant === "map" ? 480 : 800;
  const photo = listing.photos[0];
  const photoStyle = photo
    ? { backgroundImage: `url(${sizedPhotoUrl(photo, photoWidth)})` }
    : undefined;
  const photoEmptyClass = photo ? "" : " is-empty";
  const areaLabel = area?.name ?? listing.city;
  // Compute-don't-claim (4c-B2): straight-line distance to the nearest campus,
  // derived from coords. Coordless listing → no label.
  const nearestCmp = nearestCampus(listing.lat, listing.lng);
  const distanceLabel = nearestCmp
    ? format(c.kmFromUni, {
        km: nearestCmp.km.toFixed(1),
        uni: UNIVERSITY_BY_ID[nearestCmp.uniId]?.shortName ?? c.campus,
      })
    : "";
  // University lister (migration 0036): the "Verified" pill and BOVAEP line are
  // replaced with a university treatment, and an on-campus listing shows
  // "On campus · {uni}" (resolved from the lister's own university, denormalized
  // into agent.agency) instead of the nearest-campus distance guess.
  const isUniversity = agent ? isUniversityLister(agent) : false;
  const onCampusLabel =
    listing.onCampus && isUniversity
      ? format(c.onCampus, { uni: agent?.agency ?? c.campus })
      : "";
  // "Posted X ago" (day granularity, server-computed → no hydration risk). Falls
  // back to createdAt when publishedAt is absent (migration 0037 not yet stamped,
  // or a pre-0037 backfill gap). `postedToday` also drives the "Listed today"
  // pill now — the seed-driven listedToday boolean is retired for display.
  const postedIso = listing.publishedAt ?? listing.createdAt;
  const postedLabel = relativeDate(postedIso, {
    today: c.postedToday,
    yesterday: c.postedYesterday,
    daysAgo: c.postedDaysAgo,
    aMonthAgo: c.postedAMonthAgo,
    monthsAgo: c.postedMonthsAgo,
  });
  const postedToday = daysSince(postedIso) === 0;

  if (variant === "mini") {
    return (
      <Link href={linkHref} className="card card-mini">
        <div className={`card-photo${photoEmptyClass}`} style={photoStyle}>
          {!photo && <Icon name="camera" size={16} aria-hidden />}
        </div>
        <div className="card-body">
          <div className="card-price-amt">
            {formatPrice(listing.priceMonthly)}
            <span className="per">{c.perMonth}</span>
          </div>
          <div className="card-title" style={{ fontSize: "var(--t-sm)" }}>
            {listing.title}
          </div>
          <div className="card-addr">
            <Icon name="pin" size={12} />
            {areaLabel}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "homepage") {
    return (
      <Link href={linkHref} className="lc">
        <div className={`photo${photoEmptyClass}`} style={photoStyle}>
          {!photo && <Icon name="camera" size={20} aria-hidden />}
          <div className="pills">
            {agent?.status === "approved" &&
              (isUniversity ? (
                <span className="pill-mini pill-university-mini">
                  <Icon name="school" size={10} />
                  {c.universityListed}
                </span>
              ) : (
                <span className="pill-mini pill-verified-mini">
                  <Icon name="check" size={10} />
                  {c.verified}
                </span>
              ))}
            {postedToday && (
              <span className="pill-mini pill-today-mini">{c.today}</span>
            )}
          </div>
        </div>
        <div className="body">
          <div className="price">
            {formatPrice(listing.priceMonthly)}
            <span className="per"> {c.perMonth}</span>
          </div>
          <div className="lc-title">{listing.title}</div>
          <div className="meta">
            <Icon name="pin" size={12} />
            <span>
              {areaLabel} · {listing.bedrooms} {c.bed} · {listing.bathrooms} {c.bath}
            </span>
          </div>
          {agent && (
            <div className="agent-strip">
              <span className="agent-av">{initials(agent.name)}</span>
              <span>{agent.name.split(" ")[0]}</span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  if (variant === "map") {
    return (
      <Link
        href={linkHref}
        className="card card-map"
        style={{ boxShadow: "var(--shadow-modal)" }}
      >
        <div className={`card-photo${photoEmptyClass}`} style={photoStyle}>
          {!photo && <Icon name="camera" size={20} aria-hidden />}
          <div className="badges-tl">
            {agent?.status === "approved" &&
              (isUniversity ? (
                <span className="pill pill-university">
                  <Icon name="school" size={10} />
                  {c.universityListed}
                </span>
              ) : (
                <span className="pill pill-verified">
                  <Icon name="check" size={10} />
                  {c.verified}
                </span>
              ))}
          </div>
        </div>
        <div className="card-body">
          <div className="card-price-amt">
            {formatPrice(listing.priceMonthly)}
            <span className="per">{c.perMonth}</span>
          </div>
          <div className="card-title" style={{ fontSize: "var(--t-sm)" }}>
            {listing.title}
          </div>
          <div className="card-facts" style={{ fontSize: "var(--t-xs)" }}>
            <span>
              <Icon name="bed" size={12} />
              {listing.bedrooms}
            </span>
            <span>
              <Icon name="bath" size={12} />
              {listing.bathrooms}
            </span>
            {listing.sizeSqft && (
              <span>
                <Icon name="ruler" size={12} />
                {listing.sizeSqft}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  const horizontal = variant === "horizontal";
  const cardClass = [
    "card",
    horizontal ? "card-h" : "",
    isActive ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={linkHref} className={cardClass}>
      <div className={`card-photo${photoEmptyClass}`} style={photoStyle}>
        {!photo && <Icon name="camera" size={22} aria-hidden />}
        <div className="badges-tl">
          {agent?.status === "approved" &&
            (isUniversity ? (
              <span className="pill pill-university">
                <Icon name="school" size={10} />
                {c.universityListed}
              </span>
            ) : (
              <span className="pill pill-verified">
                <Icon name="check" size={10} />
                {c.verified}
              </span>
            ))}
        </div>
        <div className="badges-tr">
          <HeartButton
            listingId={listing.id}
            initialSaved={initialSaved}
            signedIn={signedIn}
            variant="pill"
            onToggled={onHeartToggled}
          />
        </div>
      </div>
      <div className="card-body">
        <div className="card-price">
          <div className="card-price-amt">
            {formatPrice(listing.priceMonthly)}
            <span className="per">{c.perMonth}</span>
          </div>
        </div>
        <div className="card-title">{listing.title}</div>
        <div className="card-addr">
          <Icon name="pin" size={12} />
          {onCampusLabel
            ? onCampusLabel
            : `${areaLabel}${distanceLabel ? ` · ${distanceLabel}` : ""}`}
        </div>
        <div className="card-facts">
          <span>
            <Icon name="bed" size={14} />
            {listing.bedrooms} {c.bed}
          </span>
          <span>
            <Icon name="bath" size={14} />
            {listing.bathrooms} {c.bath}
          </span>
          {listing.sizeSqft && (
            <span>
              <Icon name="ruler" size={14} />
              {listing.sizeSqft} {c.sqft}
            </span>
          )}
          {listing.furnishing === "full" && (
            <span style={{ color: "var(--success)" }}>
              <Icon name="check" size={14} />
              {c.furnished}
            </span>
          )}
        </div>
        <div className="card-posted">{postedLabel}</div>
        {agent && (
          <>
            <div className="card-divider" />
            <div className="card-agent">
              <div className="placeholder-avatar card-agent-avatar">
                {initials(agent.name)}
              </div>
              <div className="card-agent-info">
                <div className="card-agent-name">
                  {agent.name}
                  {agent.agency ? ` · ${agent.agency}` : ""}
                </div>
                <div className="card-agent-license tabular">
                  {isUniversity
                    ? c.listedByUniversity
                    : agent.status === "approved"
                      ? c.bovaepVerified
                      : " "}
                </div>
              </div>
              <div className="card-actions">
                {/* Decorative hints only — the whole card is one link; the real
                    WhatsApp/call buttons live on the detail page. Styled as
                    quiet glyphs (card-contact-hint), not buttons. */}
                <span className="card-contact-hint" aria-hidden="true">
                  <Icon name="whatsapp" size={14} />
                </span>
                <span className="card-contact-hint" aria-hidden="true">
                  <Icon name="phone" size={14} />
                </span>
                <span className="btn btn-primary btn-sm">{c.contact}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
