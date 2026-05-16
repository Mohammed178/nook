"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { buildListingsHref } from "@/lib/listings-search";
import type { Listing } from "@/lib/types";

const ListingsMap = dynamic(
  () => import("./listings-map").then((m) => m.ListingsMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "var(--ink-500)",
          fontSize: "var(--t-sm)",
        }}
      >
        Loading map…
      </div>
    ),
  },
);

interface ListingsBodyProps {
  listings: Listing[];
  currentQuery: string;
  mapCenter: [number, number];
  mapZoom: number;
  sortLabel: string;
  savedIds: string[];
  signedIn: boolean;
}

export function ListingsBody({
  listings,
  currentQuery,
  mapCenter,
  mapZoom,
  sortLabel,
  savedIds,
  signedIn,
}: ListingsBodyProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  if (listings.length === 0) {
    return (
      <div className="body-split">
        <div className="list-pane">
          <div className="empty-state">
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              <Icon name="search" size={32} />
            </div>
            <h3 style={{ fontSize: "var(--t-lg)", marginBottom: 4 }}>
              No rooms match these filters
            </h3>
            <p
              style={{
                fontSize: "var(--t-sm)",
                color: "var(--ink-500)",
                marginBottom: 12,
              }}
            >
              Try widening the price range, removing the female-only filter, or
              picking a different area.
            </p>
            <Link href={buildListingsHref({})} className="btn btn-secondary btn-sm">
              Clear all filters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`body-split${mobileMapOpen ? " show-map" : ""}`}>
        <div className="list-pane">
          <div className="list-meta">
            <div className="list-meta-l">
              Showing <strong>{listings.length}</strong>{" "}
              {listings.length === 1 ? "room" : "rooms"}
              {sortLabel ? ` · ${sortLabel}` : ""}
            </div>
          </div>

          <div className="list-stack">
            {listings.map((l) => (
              <div
                key={l.id}
                onMouseEnter={() => setActiveId(l.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(l.id)}
                onBlur={() => setActiveId(null)}
              >
                <ListingCard
                  listing={l}
                  variant="horizontal"
                  currentQuery={currentQuery}
                  isActive={activeId === l.id}
                  initialSaved={savedSet.has(l.id)}
                  signedIn={signedIn}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="map-pane">
          <ListingsMap
            listings={listings}
            center={mapCenter}
            zoom={mapZoom}
            activeId={activeId}
            setActiveId={setActiveId}
            currentQuery={currentQuery}
          />
        </div>
      </div>

      <button
        type="button"
        className="map-toggle-floating"
        onClick={() => setMobileMapOpen((v) => !v)}
      >
        <Icon name="map" size={14} /> {mobileMapOpen ? "Show list" : "Show map"}
      </button>
    </>
  );
}
