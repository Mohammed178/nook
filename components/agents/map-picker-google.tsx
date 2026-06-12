"use client";

import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import {
  MAPS_API_KEY,
  MAPS_MAP_ID,
  PanTo,
  mapsConfigured,
} from "@/components/maps/google";

// Google Maps half of the map-picker (loaded ssr:false by map-picker.tsx).
// Click-to-place + a draggable marker. Both report the chosen point back to
// the parent via onPick — the parent state is the source of truth (the
// labelled lat/lng inputs write the same state), so this is a convenience
// layer, never the only way to set a location (Bar-4).

interface MapPickerGoogleProps {
  center: [number, number];
  marker: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}

export function MapPickerGoogle({ center, marker, onPick }: MapPickerGoogleProps) {
  if (!mapsConfigured) {
    return <div className="map-host map-picker-host" aria-hidden="true" />;
  }

  return (
    <div className="map-host map-picker-host">
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          mapId={MAPS_MAP_ID}
          defaultCenter={{ lat: center[0], lng: center[1] }}
          defaultZoom={marker ? 15 : 12}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          style={{ width: "100%", height: "100%" }}
          onClick={(e: MapMouseEvent) => {
            const ll = e.detail.latLng;
            if (ll) onPick(ll.lat, ll.lng);
          }}
        >
          <PanTo lat={center[0]} lng={center[1]} />
          {marker ? (
            <AdvancedMarker
              position={{ lat: marker[0], lng: marker[1] }}
              draggable
              onDragEnd={(e: google.maps.MapMouseEvent) => {
                const ll = e.latLng;
                if (ll) onPick(ll.lat(), ll.lng());
              }}
            >
              <span className="map-pin-dot" />
            </AdvancedMarker>
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}
