"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { buildListingsHref } from "@/lib/listings-search";
import { riseIn, spring, staggerDelay } from "@/lib/motion";
import type { ListingWithRelations } from "@/lib/types";

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
  items: ListingWithRelations[];
  currentQuery: string;
  mapCenter: [number, number];
  mapZoom: number;
  sortLabel: string;
  savedIds: string[];
  signedIn: boolean;
}

export function ListingsBody({
  items,
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
  const reduceMotion = useReducedMotion();

  if (items.length === 0) {
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
              Try widening the price range, picking a different area, or
              clearing your filters.
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
              Showing <strong>{items.length}</strong>{" "}
              {items.length === 1 ? "room" : "rooms"}
              {sortLabel ? ` · ${sortLabel}` : ""}
            </div>
          </div>

          {/* Keyed by query so the waterfall replays when filters change */}
          <div className="list-stack" key={currentQuery}>
            {items.map(({ listing, agent, area }, index) => (
              <motion.div
                key={listing.id}
                initial={reduceMotion ? false : riseIn.initial}
                animate={riseIn.animate}
                transition={{ ...spring, delay: staggerDelay(index) }}
                onMouseEnter={() => setActiveId(listing.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(listing.id)}
                onBlur={() => setActiveId(null)}
              >
                <ListingCard
                  listing={listing}
                  agent={agent}
                  area={area}
                  variant="horizontal"
                  currentQuery={currentQuery}
                  isActive={activeId === listing.id}
                  initialSaved={savedSet.has(listing.id)}
                  signedIn={signedIn}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="map-pane">
          <ListingsMap
            items={items}
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
