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
import type { ListingWithRelations } from "@/lib/types";

interface ListingsMapProps {
  items: ListingWithRelations[];
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
  items,
  center,
  zoom,
  activeId,
  setActiveId,
  currentQuery,
}: ListingsMapProps) {
  const popupRefs = useRef<Map<string, L.Popup>>(new Map());

  const markers = useMemo(
    () =>
      items.map((item) => ({
        item,
        icon: priceIcon(item.listing.priceMonthly, activeId === item.listing.id),
      })),
    [items, activeId],
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
        {markers.map(({ item, icon }) => (
          <Marker
            key={item.listing.id}
            position={[item.listing.lat, item.listing.lng]}
            icon={icon}
            eventHandlers={{
              mouseover: () => setActiveId(item.listing.id),
              mouseout: () => setActiveId(null),
              click: (e) => {
                setActiveId(item.listing.id);
                e.target.openPopup();
              },
            }}
            ref={(marker) => {
              if (marker) {
                const popup = marker.getPopup();
                if (popup) popupRefs.current.set(item.listing.id, popup);
              }
            }}
          >
            <Popup className="listings-map-popup">
              <ListingCard
                listing={item.listing}
                agent={item.agent}
                area={item.area}
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
