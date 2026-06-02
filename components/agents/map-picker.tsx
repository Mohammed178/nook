"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { setListingCoordsAction } from "@/app/agents/dashboard/listings/actions";

// Phase 4c-B2 — agent map-picker (edit-page sibling section).
//
// Agent-facing → best-effort a11y, but NOT map-only: the leaflet click/drag is
// a convenience layer over a keyboard-accessible coordinate path. The labelled
// lat/lng number inputs + the text readout are the source of truth for the
// chosen point; the map writes into that same state. Setting a location never
// requires dragging a pin.
//
// The leaflet map is loaded with ssr:false (react-leaflet has no SSR) via the
// proven dynamic() idiom. This wrapper renders without it, so the inputs and
// Save button work even before/without the map.

const PickerMap = dynamic(
  () => import("./map-picker-leaflet").then((m) => m.MapPickerLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="leaflet-host map-picker-host" aria-hidden="true" />
    ),
  },
);

// Kuala Lumpur centre — the map's initial view when no coords are set yet.
const KL_CENTRE: [number, number] = [3.139, 101.6869];

interface MapPickerProps {
  listingId: string;
  initialLat: number | null;
  initialLng: number | null;
}

// Clamp + parse a free-typed coordinate. Returns null for blank/invalid.
function parseCoord(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function MapPicker({ listingId, initialLat, initialLng }: MapPickerProps) {
  const router = useRouter();
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const hasPoint = lat != null && lng != null;
  const center: [number, number] = hasPoint ? [lat!, lng!] : KL_CENTRE;

  function onPick(nextLat: number, nextLng: number) {
    // Round to 6 dp (~0.11 m) — enough precision, avoids float noise in inputs.
    setLat(Number(nextLat.toFixed(6)));
    setLng(Number(nextLng.toFixed(6)));
    setMessage(null);
  }

  function onSave() {
    if (lat == null || lng == null) {
      setMessage({ kind: "err", text: "Pick a point on the map or enter lat/lng first." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setListingCoordsAction(listingId, lat, lng);
      if (result.error) {
        setMessage({ kind: "err", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: "Location saved." });
      router.refresh();
    });
  }

  return (
    <div className="map-picker">
      <p className="help">
        Click the map or drag the pin to set the exact location. You can also type
        the coordinates below. Coordinates are required before you can publish.
      </p>

      <PickerMap center={center} marker={hasPoint ? center : null} onPick={onPick} />

      <div className="map-coord-fields">
        <div className="field">
          <label className="label" htmlFor="mp-lat">
            Latitude
          </label>
          <input
            id="mp-lat"
            className="input"
            name="lat"
            type="number"
            inputMode="decimal"
            step="any"
            min={-90}
            max={90}
            value={lat ?? ""}
            onChange={(e) => setLat(parseCoord(e.target.value))}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="mp-lng">
            Longitude
          </label>
          <input
            id="mp-lng"
            className="input"
            name="lng"
            type="number"
            inputMode="decimal"
            step="any"
            min={-180}
            max={180}
            value={lng ?? ""}
            onChange={(e) => setLng(parseCoord(e.target.value))}
          />
        </div>
      </div>

      <p className="map-readout">
        {hasPoint
          ? `Selected: ${lat!.toFixed(6)}, ${lng!.toFixed(6)}`
          : "No location set yet."}
      </p>

      {message ? (
        <div
          className={message.kind === "ok" ? "field-ok" : "field-err"}
          role="alert"
        >
          {message.text}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onSave}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save location"}
      </button>
    </div>
  );
}
