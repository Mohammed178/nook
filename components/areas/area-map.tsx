"use client";

import dynamic from "next/dynamic";

// Server/client seam for the area-detail map, mirroring university-map.tsx: this
// thin wrapper owns the dynamic(ssr:false) import so the server page renders it
// directly while the maps SDK only loads in the browser. The accessible
// alternative to the pins is the listing cards below.

export interface AreaMapListing {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  priceMonthly: number;
}

export interface AreaMapProps {
  /** Area name, used in the map's accessible label. */
  name: string;
  /** Short tag rendered on the centre pin. */
  label: string;
  lat: number;
  lng: number;
  listings: AreaMapListing[];
}

const Inner = dynamic(
  () => import("./area-map-google").then((m) => m.AreaMapGoogle),
  {
    ssr: false,
    loading: () => <div className="detail-map-live" aria-hidden="true" />,
  },
);

export function AreaMap(props: AreaMapProps) {
  return <Inner {...props} />;
}
