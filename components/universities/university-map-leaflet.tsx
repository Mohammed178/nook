"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { formatPrice } from "@/lib/utils";
import type { UniversityMapProps } from "./university-map";

// Leaflet half of the university map (loaded ssr:false). Campus label pin +
// the NEAR_CAMPUS_RADIUS circle + a dot per room within the radius, popup
// linking to the listing. Read-only; reuses the detail-map pin CSS classes.

const campusIcon = (label: string): L.DivIcon =>
  L.divIcon({
    className: "map-pin-campus",
    html: `<span class="map-pin-campus-label">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const listingIcon = L.divIcon({
  className: "map-pin-listing",
  html: '<span class="map-pin-dot"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export function UniversityMapLeaflet({
  name,
  shortName,
  lat,
  lng,
  radiusKm,
  listings,
}: UniversityMapProps) {
  const center: [number, number] = [lat, lng];

  return (
    <div
      className="detail-map-live"
      role="img"
      aria-label={`Map of the ${name} campus with rooms within ${radiusKm} km shown as pins. The same rooms are listed as cards below.`}
    >
      <MapContainer
        center={center}
        zoom={13}
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
        <Marker position={center} icon={campusIcon(shortName)}>
          <Popup>{name}</Popup>
        </Marker>
        {listings.map((l) => (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={listingIcon}>
            <Popup>
              <a href={`/listings/${l.slug}`}>{l.title}</a>
              <br />
              {formatPrice(l.priceMonthly)}/mo
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
