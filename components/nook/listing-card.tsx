import Link from "next/link";
import { Icon } from "./icon";
import { HeartButton } from "./heart-button";
import type { Agent, Area, Listing } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { nearestCampus } from "@/lib/distance";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { format } from "@/lib/i18n/config";
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
  const photo = listing.photos[0];
  const photoStyle = photo ? { backgroundImage: `url(${photo})` } : undefined;
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
            {agent?.status === "approved" && (
              <span className="pill-mini pill-verified-mini">
                <Icon name="check" size={10} />
                {c.verified}
              </span>
            )}
            {listing.listedToday && (
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
      <div className="card card-map" style={{ boxShadow: "var(--shadow-modal)" }}>
        <div className={`card-photo${photoEmptyClass}`} style={photoStyle}>
          {!photo && <Icon name="camera" size={20} aria-hidden />}
          <div className="badges-tl">
            <span className="pill pill-verified">
              <Icon name="check" size={10} />
              {c.verified}
            </span>
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
      </div>
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
          {agent?.status === "approved" && (
            <span className="pill pill-verified">
              <Icon name="check" size={10} />
              {c.verified}
            </span>
          )}
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
          {areaLabel}
          {distanceLabel ? ` · ${distanceLabel}` : ""}
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
                  {agent.status === "approved" ? c.bovaepVerified : " "}
                </div>
              </div>
              <div className="card-actions">
                <span className="btn btn-ico wa" title={c.whatsapp} aria-hidden="true">
                  <Icon name="whatsapp" size={14} />
                </span>
                <span className="btn btn-ico call" title={c.call} aria-hidden="true">
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
