"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import {
  createUniversityAction,
  updateUniversityAction,
} from "@/app/admin/universities/actions";
import { resolveMapsLinkAction } from "@/lib/maps/actions";
import type { UniversityRecord } from "@/lib/types";

interface UniversityFormProps {
  mode: "create" | "edit";
  /** Present in edit mode: the campus being edited. */
  initial?: UniversityRecord;
}

export function UniversityForm({ mode, initial }: UniversityFormProps) {
  const dict = useDict();
  const u = dict.admin.uni;
  const m = dict.mapPicker;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Location is set by pasting a Google Maps link (resolved to coordinates),
  // not by typing raw lat/lng. The resolved point fills the hidden lat/lng the
  // server action still parses; the readout confirms it before submit.
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
  const [link, setLink] = useState("");
  const [resolving, setResolving] = useState(false);
  const [coordMsg, setCoordMsg] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);
  const hasPoint = lat != null && lng != null;

  function onResolveLink() {
    if (link.trim() === "") {
      setCoordMsg({ kind: "err", text: m.linkEmpty });
      return;
    }
    setCoordMsg(null);
    setResolving(true);
    startTransition(async () => {
      const result = await resolveMapsLinkAction(link);
      setResolving(false);
      if (result.error || result.lat == null || result.lng == null) {
        setCoordMsg({ kind: "err", text: result.error ?? m.linkEmpty });
        return;
      }
      setLat(Number(result.lat.toFixed(6)));
      setLng(Number(result.lng.toFixed(6)));
      setCoordMsg({ kind: "ok", text: m.linkFound });
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (lat == null || lng == null) {
      setCoordMsg({ kind: "err", text: m.linkEmpty });
      return;
    }
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const action =
        mode === "edit" ? updateUniversityAction : createUniversityAction;
      const result = await action(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/universities");
      router.refresh();
    });
  }

  return (
    <form className="uni-admin-form" onSubmit={onSubmit}>
      {mode === "edit" && initial ? (
        <input type="hidden" name="slug" value={initial.slug} />
      ) : null}

      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}

      <fieldset className="profile-section">
        <legend className="profile-legend">{u.sectionCore}</legend>
        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="uf-name">{u.fName}</label>
            <input
              id="uf-name"
              className="input"
              name="name"
              type="text"
              required
              defaultValue={initial?.name ?? ""}
              aria-describedby="uf-name-help"
            />
            <div className="help" id="uf-name-help">{u.fNameHint}</div>
          </div>
          <div className="field">
            <label className="label" htmlFor="uf-short">{u.fShortName}</label>
            <input
              id="uf-short"
              className="input"
              name="short_name"
              type="text"
              required
              defaultValue={initial?.shortName ?? ""}
              aria-describedby="uf-short-help"
            />
            <div className="help" id="uf-short-help">{u.fShortNameHint}</div>
          </div>
        </div>

        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="uf-city">{u.fCity}</label>
            <input
              id="uf-city"
              className="input"
              name="city"
              type="text"
              required
              defaultValue={initial?.city ?? ""}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="uf-state">{u.fState}</label>
            <input
              id="uf-state"
              className="input"
              name="state"
              type="text"
              required
              defaultValue={initial?.state ?? ""}
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uf-maps-link">{m.linkLabel}</label>
          <div className="map-link-row">
            <input
              id="uf-maps-link"
              className="input force-ltr"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={m.linkPlaceholder}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onResolveLink();
                }
              }}
              aria-describedby="uf-maps-link-help"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onResolveLink}
              disabled={resolving}
            >
              {resolving ? u.saving : m.useLink}
            </button>
          </div>
          <div className="help" id="uf-maps-link-help">{m.linkHelp}</div>
          <p className="map-readout">
            {hasPoint
              ? format(m.selected, {
                  lat: lat!.toFixed(6),
                  lng: lng!.toFixed(6),
                })
              : m.noLocation}
          </p>
          {coordMsg ? (
            <div
              className={coordMsg.kind === "ok" ? "field-ok" : "field-err"}
              role="alert"
            >
              {coordMsg.text}
            </div>
          ) : null}
          <input type="hidden" name="lat" value={lat ?? ""} />
          <input type="hidden" name="lng" value={lng ?? ""} />
        </div>

        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="uf-students">{u.fStudentCount}</label>
            <input
              id="uf-students"
              className="input"
              name="student_count"
              type="number"
              min="0"
              step="1"
              defaultValue={initial?.studentCount != null ? String(initial.studentCount) : ""}
              aria-describedby="uf-students-help"
            />
            <div className="help" id="uf-students-help">{u.fStudentCountHint}</div>
          </div>
          <div className="field">
            <label className="label" htmlFor="uf-type">{u.fType}</label>
            <select
              id="uf-type"
              className="input"
              name="campus_type"
              required
              defaultValue={initial?.campusType ?? ""}
            >
              <option value="" disabled>
                -
              </option>
              <option value="public">{u.typePublic}</option>
              <option value="private">{u.typePrivate}</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="profile-section">
        <legend className="profile-legend">{u.sectionContent}</legend>
        <div className="field">
          <label className="label" htmlFor="uf-desc">{u.fDescription}</label>
          <textarea
            id="uf-desc"
            className="input uni-admin-textarea"
            name="description"
            rows={4}
            required
            defaultValue={initial?.description ?? ""}
            aria-describedby="uf-desc-help"
          />
          <div className="help" id="uf-desc-help">{u.fDescriptionHint}</div>
        </div>

        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="uf-transit">{u.fTransit}</label>
            <textarea
              id="uf-transit"
              className="input uni-admin-textarea"
              name="transit"
              rows={4}
              required
              defaultValue={initial ? initial.transit.join("\n") : ""}
              aria-describedby="uf-transit-help"
            />
            <div className="help" id="uf-transit-help">{u.fTransitHint}</div>
          </div>
          <div className="field">
            <label className="label" htmlFor="uf-features">{u.fFeatures}</label>
            <textarea
              id="uf-features"
              className="input uni-admin-textarea"
              name="campus_features"
              rows={4}
              required
              defaultValue={initial ? initial.campusFeatures.join("\n") : ""}
              aria-describedby="uf-features-help"
            />
            <div className="help" id="uf-features-help">{u.fFeaturesHint}</div>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uf-website">{u.fWebsite}</label>
          <input
            id="uf-website"
            className="input"
            name="website"
            type="url"
            required
            placeholder="https://"
            defaultValue={initial?.website ?? ""}
            aria-describedby="uf-website-help"
          />
          <div className="help" id="uf-website-help">{u.fWebsiteHint}</div>
        </div>

        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="uf-photo">{u.fPhotoUrl}</label>
            <input
              id="uf-photo"
              className="input"
              name="photo_url"
              type="url"
              required
              placeholder="https://"
              defaultValue={initial?.photo ?? ""}
              aria-describedby="uf-photo-help"
            />
            <div className="help" id="uf-photo-help">{u.fPhotoUrlHint}</div>
          </div>
          <div className="field">
            <label className="label" htmlFor="uf-photofile">{u.fPhotoFile}</label>
            <input
              id="uf-photofile"
              className="input"
              name="photo_file"
              type="text"
              required
              defaultValue={initial?.photoFile ?? ""}
              aria-describedby="uf-photofile-help"
            />
            <div className="help" id="uf-photofile-help">{u.fPhotoFileHint}</div>
          </div>
        </div>
      </fieldset>

      <div className="profile-form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? u.saving : u.save}
        </button>
        <Link href="/admin/universities" className="btn btn-ghost">
          {u.backToList}
        </Link>
      </div>
    </form>
  );
}
