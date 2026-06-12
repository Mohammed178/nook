"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

// Shared Google Maps plumbing for the four map surfaces. The key/Map ID come
// from env; when they're absent (fresh clone, CI) every map surface renders
// its quiet placeholder instead of crashing — the maps are progressive
// enhancement, never load-bearing (Bar-4: each map has a text alternative).

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// AdvancedMarker requires a Map ID. Required alongside the key.
export const MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";

export const mapsConfigured = MAPS_API_KEY !== "" && MAPS_MAP_ID !== "";

interface GeoCircleProps {
  lat: number;
  lng: number;
  radiusKm: number;
}

// vis.gl ships no <Circle>; draw the radius ring imperatively on the map
// instance. Colours match the old .detail-radius-circle (brand slate).
export function GeoCircle({ lat, lng, radiusKm }: GeoCircleProps) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      map,
      center: { lat, lng },
      radius: radiusKm * 1000,
      strokeColor: "#2F4156",
      strokeOpacity: 0.7,
      strokeWeight: 1,
      fillColor: "#2F4156",
      fillOpacity: 0.05,
      clickable: false,
    });
    circleRef.current = circle;
    return () => {
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map, lat, lng, radiusKm]);

  return null;
}

// Imperative recenter when the parent-controlled center/zoom changes
// (filter switches, typed coordinates). Replaces leaflet's setView child.
export function PanTo({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
    if (zoom != null) map.setZoom(zoom);
  }, [map, lat, lng, zoom]);
  return null;
}
