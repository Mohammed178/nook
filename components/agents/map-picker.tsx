"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { setListingCoordsAction } from "@/app/agents/dashboard/listings/actions";
import { resolveMapsLinkAction } from "@/lib/maps/actions";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";

// Phase 4c-B2, agent map-picker (edit-page sibling section).
//
// Agents set the location by pasting a Google Maps link — they don't read
// coordinates off a map, they share the place they already found. The pasted
// link is resolved to coordinates (server action; short links are expanded
// there), which pin the map for visual confirmation. The map click/drag stays
// as a keyboard-independent fine-tune convenience, never the only path (Bar-4):
// the link field is the primary, keyboard-accessible way in.
//
// The Google map is loaded with ssr:false via the proven dynamic() idiom. This
// wrapper renders without it, so the link field and Save button work even
// before/without the map.

const PickerMap = dynamic(
  () => import("./map-picker-google").then((m) => m.MapPickerGoogle),
  {
    ssr: false,
    loading: () => (
      <div className="map-host map-picker-host" aria-hidden="true" />
    ),
  },
);

// Kuala Lumpur centre, the map's initial view when no coords are set yet.
const KL_CENTRE: [number, number] = [3.139, 101.6869];

interface MapPickerProps {
  listingId: string;
  initialLat: number | null;
  initialLng: number | null;
}

export function MapPicker({ listingId, initialLat, initialLng }: MapPickerProps) {
  const dict = useDict();
  const t = dict.mapPicker;
  const router = useRouter();
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [resolving, setResolving] = useState(false);

  const hasPoint = lat != null && lng != null;
  const center: [number, number] = hasPoint ? [lat!, lng!] : KL_CENTRE;

  function onPick(nextLat: number, nextLng: number) {
    // Round to 6 dp (~0.11 m), enough precision, avoids float noise.
    setLat(Number(nextLat.toFixed(6)));
    setLng(Number(nextLng.toFixed(6)));
    setMessage(null);
  }

  function onResolveLink() {
    if (link.trim() === "") {
      setMessage({ kind: "err", text: t.linkEmpty });
      return;
    }
    setMessage(null);
    setResolving(true);
    startTransition(async () => {
      const result = await resolveMapsLinkAction(link);
      setResolving(false);
      if (result.error || result.lat == null || result.lng == null) {
        setMessage({ kind: "err", text: result.error ?? t.linkEmpty });
        return;
      }
      onPick(result.lat, result.lng);
      setMessage({ kind: "ok", text: t.linkFound });
    });
  }

  function onSave() {
    if (lat == null || lng == null) {
      setMessage({ kind: "err", text: t.pickFirst });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setListingCoordsAction(listingId, lat, lng);
      if (result.error) {
        setMessage({ kind: "err", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: t.locationSaved });
      router.refresh();
    });
  }

  return (
    <div className="map-picker">
      <p className="help">{t.help}</p>

      <div className="field map-link-field">
        <label className="label" htmlFor="mp-link">
          {t.linkLabel}
        </label>
        <div className="map-link-row">
          <input
            id="mp-link"
            className="input force-ltr"
            name="mapsLink"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={t.linkPlaceholder}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onResolveLink();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResolveLink}
            disabled={resolving}
          >
            {resolving ? dict.common.saving : t.useLink}
          </button>
        </div>
        <div className="help">{t.linkHelp}</div>
      </div>

      <PickerMap center={center} marker={hasPoint ? center : null} onPick={onPick} />

      <p className="map-readout">
        {hasPoint
          ? format(t.selected, { lat: lat!.toFixed(6), lng: lng!.toFixed(6) })
          : t.noLocation}
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
        {pending ? dict.common.saving : t.saveLocation}
      </button>
    </div>
  );
}
