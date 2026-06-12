"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import {
  GeoCircle,
  MAPS_API_KEY,
  MAPS_MAP_ID,
  mapsConfigured,
} from "@/components/maps/google";
import type { ListingDetailMapProps } from "./listing-detail-map";

// Google Maps half of the detail map (loaded ssr:false). Single listing pin +
// a radius circle + a label per campus within the radius. Read-only: no
// click/drag handlers. The accessible text alternative is the campus distance
// chips rendered by the page, not these pins.

export function ListingDetailMapGoogle({
  lat,
  lng,
  title,
  campuses,
  radiusKm,
}: ListingDetailMapProps) {
  // Guarded by the wrapper, but narrow for TS.
  if (lat == null || lng == null) return null;
  if (!mapsConfigured) {
    return <div className="detail-map-live" aria-hidden="true" />;
  }

  return (
    <div
      className="detail-map-live"
      role="img"
      aria-label={`Map showing the location of ${title} and nearby campuses. Distances are listed as text below.`}
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
        >
          <GeoCircle lat={lat} lng={lng} radiusKm={radiusKm} />
          <AdvancedMarker position={{ lat, lng }} title={title}>
            <span className="map-pin-dot" />
          </AdvancedMarker>
          {campuses.map((c) => (
            <AdvancedMarker
              key={c.id}
              position={{ lat: c.lat, lng: c.lng }}
              title={`${c.shortName} — ${c.km.toFixed(1)} km`}
            >
              <span className="map-pin-campus-label">{c.shortName}</span>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
