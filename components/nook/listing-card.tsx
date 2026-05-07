import Link from "next/link";
import { Icon } from "./icon";
import { HeartButton } from "./heart-button";
import type { Listing } from "@/lib/types";
import { AGENT_BY_ID } from "@/lib/seed/agents";
import { AREA_BY_ID } from "@/lib/seed/areas";
import { formatPrice } from "@/lib/utils";

export type ListingCardVariant =
  | "vertical"
  | "horizontal"
  | "mini"
  | "map"
  | "homepage";

interface ListingCardProps {
  listing: Listing;
  variant?: ListingCardVariant;
  href?: string;
  currentQuery?: string;
  isActive?: boolean;
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
  variant = "vertical",
  href,
  currentQuery,
  isActive,
}: ListingCardProps) {
  const agent = AGENT_BY_ID[listing.agentId];
  const area = AREA_BY_ID[listing.areaId];
  const baseHref = href ?? `/listings/${listing.slug}`;
  const linkHref = currentQuery ? `${baseHref}?${currentQuery}` : baseHref;
  const photo = listing.photos[0];
  const areaLabel = area?.name ?? listing.city;
  const distanceLabel =
    listing.walkMinsToCampus != null ? `${listing.walkMinsToCampus} min walk` : "";

  if (variant === "mini") {
    return (
      <Link href={linkHref} className="card card-mini">
        <div className="card-photo" style={{ backgroundImage: `url(${photo})` }} />
        <div className="card-body">
          <div className="card-price-amt">
            {formatPrice(listing.priceMonthly)}
            <span className="per">/mo</span>
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
        <div className="photo" style={{ backgroundImage: `url(${photo})` }}>
          <div className="pills">
            {agent?.verified && (
              <span className="pill-mini pill-verified-mini">
                <Icon name="check" size={10} />
                Verified
              </span>
            )}
            {listing.listedToday && (
              <span className="pill-mini pill-today-mini">Today</span>
            )}
          </div>
        </div>
        <div className="body">
          <div className="price">
            {formatPrice(listing.priceMonthly)}
            <span className="per"> /mo</span>
          </div>
          <div className="lc-title">{listing.title}</div>
          <div className="meta">
            <Icon name="pin" size={12} />
            <span>
              {areaLabel} · {listing.bedrooms} bed · {listing.bathrooms} bath
            </span>
          </div>
          {agent && (
            <div className="agent-strip">
              <span className="agent-av">{initials(agent.name)}</span>
              <span>
                {agent.name.split(" ")[0]} ·{" "}
                <span className="star">★</span> {agent.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  if (variant === "map") {
    return (
      <div className="card card-map" style={{ boxShadow: "var(--shadow-modal)" }}>
        <div className="card-photo" style={{ backgroundImage: `url(${photo})` }}>
          <div className="badges-tl">
            <span className="pill pill-verified">
              <Icon name="check" size={10} />
              Verified
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="card-price-amt">
            {formatPrice(listing.priceMonthly)}
            <span className="per">/mo</span>
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
      <div className="card-photo" style={{ backgroundImage: `url(${photo})` }}>
        <div className="badges-tl">
          {agent?.verified && (
            <span className="pill pill-verified">
              <Icon name="check" size={10} />
              Verified
            </span>
          )}
        </div>
        <div className="badges-tr">
          <HeartButton />
        </div>
      </div>
      <div className="card-body">
        <div className="card-price">
          <div className="card-price-amt">
            {formatPrice(listing.priceMonthly)}
            <span className="per">/mo</span>
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
            {listing.bedrooms} bed
          </span>
          <span>
            <Icon name="bath" size={14} />
            {listing.bathrooms} bath
          </span>
          {listing.sizeSqft && (
            <span>
              <Icon name="ruler" size={14} />
              {listing.sizeSqft} sqft
            </span>
          )}
          {listing.furnishing === "full" && (
            <span style={{ color: "var(--success)" }}>
              <Icon name="check" size={14} />
              Furnished
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
                  {agent.verified ? "BOVAEP verified" : "Independent"}
                </div>
              </div>
              <div className="card-actions">
                <span className="btn btn-ico wa" title="WhatsApp" aria-hidden="true">
                  <Icon name="whatsapp" size={14} />
                </span>
                <span className="btn btn-ico call" title="Call" aria-hidden="true">
                  <Icon name="phone" size={14} />
                </span>
                <span className="btn btn-primary btn-sm">Contact</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
