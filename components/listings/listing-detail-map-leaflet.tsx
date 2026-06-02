"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import type { ListingDetailMapProps } from "./listing-detail-map";

// Leaflet half of the detail map (loaded ssr:false). Single listing marker +
// a radius circle + a pin per campus within the radius. divIcons (no default
// marker asset wiring). Read-only: no click/drag handlers. The accessible text
// alternative is the campus distance chips rendered by the page, not these pins.

const listingIcon = L.divIcon({
  className: "map-pin-listing",
  html: '<span class="map-pin-dot"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function campusIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "map-pin-campus",
    html: `<span class="map-pin-campus-label">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function ListingDetailMapLeaflet({
  lat,
  lng,
  title,
  campuses,
  radiusKm,
}: ListingDetailMapProps) {
  // Guarded by the wrapper, but narrow for TS.
  if (lat == null || lng == null) return null;
  const center: [number, number] = [lat, lng];

  return (
    <div
      className="detail-map-live"
      role="img"
      aria-label={`Map showing the location of ${title} and nearby campuses. Distances are listed as text below.`}
    >
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ className: "detail-radius-circle", weight: 1, fillOpacity: 0.05 }}
        />
        <Marker position={center} icon={listingIcon}>
          <Popup>{title}</Popup>
        </Marker>
        {campuses.map((c) => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={campusIcon(c.shortName)}>
            <Popup>
              {c.shortName} — {c.km.toFixed(1)} km
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
