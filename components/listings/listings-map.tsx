"use client";

import { useMemo, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import {
  MAPS_API_KEY,
  MAPS_MAP_ID,
  PanTo,
  mapsConfigured,
} from "@/components/maps/google";
import { ListingCard } from "@/components/nook/listing-card";
import type { ListingWithRelations } from "@/lib/types";

interface ListingsMapProps {
  items: ListingWithRelations[];
  center: [number, number];
  zoom: number;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  currentQuery?: string;
}

// Google Maps pane of the listings split view. Price-pill markers (the same
// .price-divicon CSS as before); clicking a pill opens our
// own overlay card (custom, not the stock InfoWindow) hosting the map-variant
// ListingCard. The list pane is the accessible alternative to the pins.
export function ListingsMap({
  items,
  center,
  zoom,
  activeId,
  setActiveId,
  currentQuery,
}: ListingsMapProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  // lat/lng are nullable since 4b (drafts carry no coordinates). The map only
  // ever receives published listings (RLS hides drafts), so this flatMap guard
  // is belt-and-braces, a coordinate-less listing simply gets no marker.
  const markers = useMemo(
    () =>
      items.flatMap((item) => {
        const { lat, lng } = item.listing;
        if (lat == null || lng == null) return [];
        return [{ item, lat, lng }];
      }),
    [items],
  );

  if (!mapsConfigured) {
    return <div className="map-host" aria-hidden="true" />;
  }

  const open = markers.find((m) => m.item.listing.id === openId);

  return (
    <div className="map-host">
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          mapId={MAPS_MAP_ID}
          defaultCenter={{ lat: center[0], lng: center[1] }}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          style={{ width: "100%", height: "100%" }}
          onClick={() => setOpenId(null)}
        >
          <PanTo lat={center[0]} lng={center[1]} zoom={zoom} />
          {markers.map(({ item, lat, lng }) => {
            const id = item.listing.id;
            return (
              <AdvancedMarker
                key={id}
                position={{ lat, lng }}
                zIndex={activeId === id ? 500 : undefined}
                onClick={() => {
                  setActiveId(id);
                  setOpenId(id === openId ? null : id);
                }}
              >
                <span
                  className={`price-divicon${activeId === id ? " active" : ""}`}
                  onMouseEnter={() => setActiveId(id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  RM {item.listing.priceMonthly}
                </span>
              </AdvancedMarker>
            );
          })}
          {open && (
            <AdvancedMarker
              position={{ lat: open.lat, lng: open.lng }}
              zIndex={1000}
            >
              <div className="map-overlay-card">
                <button
                  type="button"
                  className="map-overlay-close"
                  aria-label="Close listing preview"
                  onClick={() => setOpenId(null)}
                >
                  ×
                </button>
                <ListingCard
                  listing={open.item.listing}
                  agent={open.item.agent}
                  area={open.item.area}
                  variant="map"
                  currentQuery={currentQuery}
                />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
