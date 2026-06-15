"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import {
  GeoCircle,
  MAPS_API_KEY,
  MAPS_MAP_ID,
  mapsConfigured,
} from "@/components/maps/google";
import { formatPrice } from "@/lib/utils";
import { useDict } from "@/lib/i18n/context";
import type { UniversityMapProps } from "./university-map";

// Google Maps half of the university map (loaded ssr:false). Campus label pin
// + the NEAR_CAMPUS_RADIUS circle + a dot per room within the radius. Clicking
// a dot opens our own overlay card (custom, not the stock InfoWindow) linking
// to the listing. The page's room cards are the accessible alternative.

export function UniversityMapGoogle({
  name,
  shortName,
  lat,
  lng,
  radiusKm,
  listings,
}: UniversityMapProps) {
  const common = useDict().common;
  const [openId, setOpenId] = useState<string | null>(null);

  if (!mapsConfigured) {
    return <div className="detail-map-live" aria-hidden="true" />;
  }

  const open = listings.find((l) => l.id === openId);

  return (
    <div
      className="detail-map-live"
      role="img"
      aria-label={`Map of the ${name} campus with rooms within ${radiusKm} km shown as pins. The same rooms are listed as cards below.`}
    >
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          mapId={MAPS_MAP_ID}
          defaultCenter={{ lat, lng }}
          defaultZoom={13}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: "100%", height: "100%" }}
          onClick={() => setOpenId(null)}
        >
          <GeoCircle lat={lat} lng={lng} radiusKm={radiusKm} />
          <AdvancedMarker position={{ lat, lng }} title={name}>
            <span className="map-pin-campus-label">{shortName}</span>
          </AdvancedMarker>
          {listings.map((l) => (
            <AdvancedMarker
              key={l.id}
              position={{ lat: l.lat, lng: l.lng }}
              title={`${l.title}, ${formatPrice(l.priceMonthly)}/mo`}
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
                  aria-label={common.close}
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
