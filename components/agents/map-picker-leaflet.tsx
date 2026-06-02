"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";

// Leaflet half of the map-picker (loaded ssr:false by map-picker.tsx). Net-new
// in B2: click-to-place (useMapEvents) + a draggable marker. Both report the
// chosen point back to the parent via onPick — the parent state is the source
// of truth (keyboard inputs write the same state), so this is a convenience
// layer, never the only way to set a location.

// A divIcon avoids leaflet's default-marker image 404s (no asset wiring needed)
// and matches the listings map's divIcon approach.
const pinIcon = L.divIcon({
  className: "map-pin-pick",
  html: '<span class="map-pin-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

interface MapPickerLeafletProps {
  center: [number, number];
  marker: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}

// Recenter when the parent-provided center changes (e.g. typed coordinates).
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [map, center]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPickerLeaflet({ center, marker, onPick }: MapPickerLeafletProps) {
  return (
    <div className="leaflet-host map-picker-host">
      <MapContainer
        center={center}
        zoom={marker ? 15 : 12}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        <ClickToPlace onPick={onPick} />
        {marker ? (
          <Marker
            position={marker}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onPick(lat, lng);
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
