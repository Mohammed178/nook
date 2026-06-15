"use client";

import dynamic from "next/dynamic";
import { useDict } from "@/lib/i18n/context";

// Phase 4c-B2, student-facing detail map (replaces the decorative SVG block).
// Client wrapper that loads the Google Maps half ssr:false. The map is read-only,
// so the a11y burden is low, but the map is NOT the only carrier of the
// distance information: the page renders the campus distance chips as text
// alongside this map (the text alternative a screen-reader user relies on).
// This component only draws the visual; it carries an aria-label and the chips
// live in the page.

export interface DetailMapCampus {
  id: string;
  shortName: string;
  km: number;
  lat: number;
  lng: number;
}

export interface ListingDetailMapProps {
  lat: number | null;
  lng: number | null;
  title: string;
  campuses: DetailMapCampus[];
  radiusKm: number;
}

const DetailMap = dynamic(
  () => import("./listing-detail-map-google").then((m) => m.ListingDetailMapGoogle),
  {
    ssr: false,
    loading: () => <div className="detail-map-live" aria-hidden="true" />,
  },
);

export function ListingDetailMap(props: ListingDetailMapProps) {
  const maps = useDict().maps;
  if (props.lat == null || props.lng == null) {
    return (
      <div
        className="detail-map-live detail-map-empty"
        role="img"
        aria-label={maps.locationNotSet}
      >
        {maps.locationNotSetShort}
      </div>
    );
  }
  return <DetailMap {...props} />;
}
