"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { ListingCard } from "@/components/nook/listing-card";
import type { Listing } from "@/lib/types";

interface ListingsMapProps {
  listings: Listing[];
  center: [number, number];
  zoom: number;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  currentQuery?: string;
}

function priceIcon(price: number, active: boolean): L.DivIcon {
  const text = `RM ${price}`;
  const width = Math.ceil(text.length * 7) + 22;
  const height = 26;
  return L.divIcon({
    html: text,
    className: `price-divicon${active ? " active" : ""}`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
}

function FlyToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

export function ListingsMap({
  listings,
  center,
  zoom,
  activeId,
  setActiveId,
  currentQuery,
}: ListingsMapProps) {
  const popupRefs = useRef<Map<string, L.Popup>>(new Map());

  const markers = useMemo(
    () =>
      listings.map((l) => ({
        l,
        icon: priceIcon(l.priceMonthly, activeId === l.id),
      })),
    [listings, activeId],
  );

  return (
    <div className="leaflet-host">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToCenter center={center} zoom={zoom} />
        {markers.map(({ l, icon }) => (
          <Marker
            key={l.id}
            position={[l.lat, l.lng]}
            icon={icon}
            eventHandlers={{
              mouseover: () => setActiveId(l.id),
              mouseout: () => setActiveId(null),
              click: (e) => {
                setActiveId(l.id);
                e.target.openPopup();
              },
            }}
            ref={(marker) => {
              if (marker) {
                const popup = marker.getPopup();
                if (popup) popupRefs.current.set(l.id, popup);
              }
            }}
          >
            <Popup className="listings-map-popup">
              <ListingCard
                listing={l}
                variant="map"
                currentQuery={currentQuery}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
