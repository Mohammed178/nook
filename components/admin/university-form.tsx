"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDict } from "@/lib/i18n/context";
import {
  createUniversityAction,
  updateUniversityAction,
} from "@/app/admin/universities/actions";
import type { UniversityRecord } from "@/lib/types";

interface UniversityFormProps {
  mode: "create" | "edit";
  /** Present in edit mode: the campus being edited. */
  initial?: UniversityRecord;
}

export function UniversityForm({ mode, initial }: UniversityFormProps) {
  const u = useDict().admin.uni;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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

        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="uf-lat">{u.fLat}</label>
            <input
              id="uf-lat"
              className="input"
              name="lat"
              type="number"
              step="any"
              required
              defaultValue={initial ? String(initial.lat) : ""}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="uf-lng">{u.fLng}</label>
            <input
              id="uf-lng"
              className="input"
              name="lng"
              type="number"
              step="any"
              required
              defaultValue={initial ? String(initial.lng) : ""}
              aria-describedby="uf-coords-help"
            />
          </div>
        </div>
        <div className="help" id="uf-coords-help">{u.fCoordsHint}</div>

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
                —
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
