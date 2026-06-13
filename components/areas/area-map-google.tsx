"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import {
  MAPS_API_KEY,
  MAPS_MAP_ID,
  mapsConfigured,
} from "@/components/maps/google";
import { formatPrice } from "@/lib/utils";
import type { AreaMapProps } from "./area-map";

// Google Maps half of the area map (loaded ssr:false). A centre pin marks the
// neighbourhood, a dot marks each live room in the area; clicking a dot opens
// the same overlay card the university and listings maps use. The page's room
// cards are the accessible alternative.

export function AreaMapGoogle({ name, label, lat, lng, listings }: AreaMapProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!mapsConfigured) {
    return <div className="detail-map-live" aria-hidden="true" />;
  }

  const open = listings.find((l) => l.id === openId);

  return (
    <div
      className="detail-map-live"
      role="img"
      aria-label={`Map of ${name} with its rooms shown as pins. The same rooms are listed as cards below.`}
    >
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          mapId={MAPS_MAP_ID}
          defaultCenter={{ lat, lng }}
          defaultZoom={14}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: "100%", height: "100%" }}
          onClick={() => setOpenId(null)}
        >
          <AdvancedMarker position={{ lat, lng }} title={name}>
            <span className="map-pin-campus-label">{label}</span>
          </AdvancedMarker>
          {listings.map((l) => (
            <AdvancedMarker
              key={l.id}
              position={{ lat: l.lat, lng: l.lng }}
              title={`${l.title} — ${formatPrice(l.priceMonthly)}/mo`}
              onClick={() => setOpenId(l.id === openId ? null : l.id)}
            >
              <span className="map-pin-dot" />
            </AdvancedMarker>
          ))}
          {open && (
            <AdvancedMarker
              position={{ lat: open.lat, lng: open.lng }}
              zIndex={1000}
            >
              <div className="map-overlay-card map-overlay-mini">
                <button
                  type="button"
                  className="map-overlay-close"
                  aria-label="Close"
                  onClick={() => setOpenId(null)}
                >
                  ×
                </button>
                <a href={`/listings/${open.slug}`}>{open.title}</a>
                <div className="price">{formatPrice(open.priceMonthly)}/mo</div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
