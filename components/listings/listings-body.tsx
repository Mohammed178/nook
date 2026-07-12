"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { buildListingsHref } from "@/lib/listings-search";
import { useDict } from "@/lib/i18n/context";
import { riseIn, spring, staggerDelay } from "@/lib/motion";
import type { ListingWithRelations } from "@/lib/types";
import type { ListingsView } from "@/lib/listings-search";

const ListingsMap = dynamic(
  () => import("./listings-map").then((m) => m.ListingsMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

function MapLoading() {
  const l = useDict().listings;
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "var(--ink-500)",
        fontSize: "var(--t-sm)",
      }}
    >
      {l.loadingMap}
    </div>
  );
}

interface ListingsBodyProps {
  items: ListingWithRelations[];
  currentQuery: string;
  mapCenter: [number, number];
  mapZoom: number;
  /** "map" = full-bleed map-only view; "list" = split list + inline square map. */
  view: ListingsView;
  sortLabel: string;
  savedIds: string[];
  signedIn: boolean;
}

export function ListingsBody({
  items,
  currentQuery,
  mapCenter,
  mapZoom,
  view,
  sortLabel,
  savedIds,
  signedIn,
}: ListingsBodyProps) {
  const dict = useDict();
  const l = dict.listings;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  // Below 1181px the split-view map pane is display:none (CSS), but a mounted
  // <ListingsMap> still pulls the whole Maps SDK. Gate mounting on the same
  // breakpoint; once the user opens the mobile map, keep it mounted so
  // toggling back and forth doesn't re-init the map.
  const [desktopMap, setDesktopMap] = useState(false);
  const [mapTouched, setMapTouched] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1181px)"); // keep in sync with the .map-pane media query
    const update = () => setDesktopMap(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
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
              {l.noRoomsMatch}
            </h3>
            <p
              style={{
                fontSize: "var(--t-sm)",
                color: "var(--ink-500)",
                marginBottom: 12,
              }}
            >
              {l.noRoomsHint}
            </p>
            <Link href={buildListingsHref({})} className="btn btn-secondary btn-sm">
              {l.clearAllFilters}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (view === "map") {
    // Phones hide the filter bar's List|Map toggle, so a ?view=map URL opened
    // there had no way back to the list. Same query, minus the view param.
    const listParams = new URLSearchParams(currentQuery);
    listParams.delete("view");
    const listQuery = listParams.toString();
    return (
      <div className="body-maponly">
        <ListingsMap
          items={items}
          center={mapCenter}
          zoom={mapZoom}
          activeId={activeId}
          setActiveId={setActiveId}
          currentQuery={currentQuery}
        />
        <Link
          href={listQuery ? `/listings?${listQuery}` : "/listings"}
          className="map-toggle-floating maponly-back"
        >
          <Icon name="list" size={14} /> {l.showList}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={`body-split${mobileMapOpen ? " show-map" : ""}`}>
        <div className="list-pane">
          <div className="list-meta">
            <div className="list-meta-l">
              {l.showing} <strong>{items.length}</strong>{" "}
              {items.length === 1 ? l.room : l.rooms}
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
                  card={dict.card}
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
          {(desktopMap || mapTouched) && (
            <ListingsMap
              items={items}
              center={mapCenter}
              zoom={mapZoom}
              activeId={activeId}
              setActiveId={setActiveId}
              currentQuery={currentQuery}
            />
          )}
        </div>
      </div>

      <button
        type="button"
        className="map-toggle-floating"
        onClick={() => {
          setMapTouched(true);
          setMobileMapOpen((v) => !v);
        }}
      >
        <Icon name="map" size={14} /> {mobileMapOpen ? l.showList : l.showMap}
      </button>
    </>
  );
}
