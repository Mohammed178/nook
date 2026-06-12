"use client";

import dynamic from "next/dynamic";

// Server/client seam for the university page map, mirroring
// listing-detail-map.tsx: this thin wrapper owns the dynamic(ssr:false) import
// so the server page can render it directly; Leaflet itself only ever loads in
// the browser. The accessible alternative to the pins is the page's text
// content (area links + listing cards), not the map.

export interface UniMapListing {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  priceMonthly: number;
}

export interface UniversityMapProps {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  radiusKm: number;
  listings: UniMapListing[];
}

const UniMap = dynamic(
  () => import("./university-map-leaflet").then((m) => m.UniversityMapLeaflet),
  {
    ssr: false,
    loading: () => <div className="detail-map-live" aria-hidden="true" />,
  },
);

export function UniversityMap(props: UniversityMapProps) {
  return <UniMap {...props} />;
}
