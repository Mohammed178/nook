"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Area, Listing } from "@/lib/types";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import {
  createListingAction,
  updateListingAction,
  type ListingActionResult,
} from "@/app/agents/dashboard/listings/actions";

// Shared create/edit form (L-4b.15). Mirrors agent-register-form's structure:
// useTransition, server-action submission, the existing .field/.label/.input/
// .select/.textarea/.field-err classes. No photos, no lat/lng, no status field
// (L-4b.8 / LC-19 / L-4b.7). Accessibility is a build gate: every field has a
// <label htmlFor>; errors are announced via role="alert" and wired with
// aria-describedby + aria-invalid; checkbox groups are <fieldset>/<legend>.

const TYPE_VALUES = ["room", "studio", "apartment", "house"] as const;
const FURNISHING_VALUES = ["unfurnished", "partial", "full"] as const;
const GENDER_VALUES = ["", "male", "female", "mixed"] as const;
// Amenity tokens drawn from the seed listings. No amenities table exists, so the
// option list is a small constant (4b scope).
const AMENITY_VALUES = [
  "wifi",
  "aircon",
  "washer",
  "kitchen",
  "shared-kitchen",
  "parking",
  "pool",
  "gym",
  "garden",
  "security",
  "concierge",
] as const;

interface ListingFormProps {
  areas: Area[];
  // Present → edit mode (fields pre-filled, submits an update); absent → create.
  listing?: Listing;
  // University lister (migration 0036): when true, the on-campus toggle appears
  // at the top of the location section. universityName fills the read-only
  // "location set to the {university} campus" summary when it is ticked.
  isUniversity?: boolean;
  universityName?: string;
}

function err(id: string, fieldErrors: Record<string, string>) {
  const msg = fieldErrors[id];
  if (!msg) return null;
  return (
    <div className="field-err" id={`${id}-err`} role="alert">
      {msg}
    </div>
  );
}

// aria-* wiring for a field that may carry an error.
function aria(id: string, fieldErrors: Record<string, string>) {
  const hasErr = Boolean(fieldErrors[id]);
  return {
    "aria-invalid": hasErr || undefined,
    "aria-describedby": hasErr ? `${id}-err` : undefined,
  };
}

export function ListingForm({
  areas,
  listing,
  isUniversity = false,
  universityName,
}: ListingFormProps) {
  const dict = useDict();
  const f = dict.listingForm;
  const router = useRouter();
  const isEdit = Boolean(listing);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  // Campus toggle state (university listers only). When ticked, the location
  // inputs collapse to a read-only summary and the server fills address/lat/lng
  // from the university record.
  const [onCampus, setOnCampus] = useState(listing?.onCampus ?? false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result: ListingActionResult = isEdit
        ? await updateListingAction(listing!.id, fd)
        : await createListingAction(fd);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      // On create, go to the edit page, that's where photos are added (4c-B1).
      // On edit, back to the dashboard list.
      if (!isEdit && result.id) {
        router.push(`/agents/dashboard/listings/${result.id}/edit`);
      } else {
        router.push("/agents/dashboard");
      }
      router.refresh();
    });
  }

  const sel = (v: string | number | undefined) =>
    v === undefined || v === null ? "" : String(v);

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="lf-title">
          {f.title}
        </label>
        <input
          id="lf-title"
          className="input"
          name="title"
          type="text"
          required
          defaultValue={listing?.title ?? ""}
          {...aria("title", fieldErrors)}
        />
        {err("title", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-type">
          {f.propertyType}
        </label>
        <select
          id="lf-type"
          className="select"
          name="type"
          required
          defaultValue={listing?.type ?? ""}
          {...aria("type", fieldErrors)}
        >
          <option value="" disabled>
            {f.chooseType}
          </option>
          {TYPE_VALUES.map((v) => (
            <option key={v} value={v}>
              {dict.listings.types[v]}
            </option>
          ))}
        </select>
        {err("type", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-description">
          {f.description}
        </label>
        <textarea
          id="lf-description"
          className="textarea"
          name="description"
          required
          rows={6}
          defaultValue={listing?.description ?? ""}
          {...aria("description", fieldErrors)}
        />
        {err("description", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-price">
          {f.monthlyPrice}
        </label>
        <input
          id="lf-price"
          className="input"
          name="priceMonthly"
          type="number"
          inputMode="numeric"
          min={1}
          required
          defaultValue={sel(listing?.priceMonthly)}
          {...aria("priceMonthly", fieldErrors)}
        />
        {err("priceMonthly", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-deposit">
          {f.deposit}
        </label>
        <input
          id="lf-deposit"
          className="input"
          name="deposit"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={sel(listing?.deposit)}
          {...aria("deposit", fieldErrors)}
        />
        <div className="help">{f.optional}</div>
        {err("deposit", fieldErrors)}
      </div>

      <div className="field">
        <label className="check-row" htmlFor="lf-utilities">
          <input
            id="lf-utilities"
            type="checkbox"
            name="utilitiesIncluded"
            defaultChecked={listing?.utilitiesIncluded ?? false}
          />
          <span>{f.utilitiesIncluded}</span>
        </label>
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-bedrooms">
          {f.bedrooms}
        </label>
        <input
          id="lf-bedrooms"
          className="input"
          name="bedrooms"
          type="number"
          inputMode="numeric"
          min={0}
          required
          defaultValue={sel(listing?.bedrooms)}
          {...aria("bedrooms", fieldErrors)}
        />
        {err("bedrooms", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-bathrooms">
          {f.bathrooms}
        </label>
        <input
          id="lf-bathrooms"
          className="input"
          name="bathrooms"
          type="number"
          inputMode="numeric"
          min={0}
          required
          defaultValue={sel(listing?.bathrooms)}
          {...aria("bathrooms", fieldErrors)}
        />
        {err("bathrooms", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-size">
          {f.size}
        </label>
        <input
          id="lf-size"
          className="input"
          name="sizeSqft"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={sel(listing?.sizeSqft)}
          {...aria("sizeSqft", fieldErrors)}
        />
        <div className="help">{f.optional}</div>
        {err("sizeSqft", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-furnishing">
          {f.furnishing}
        </label>
        <select
          id="lf-furnishing"
          className="select"
          name="furnishing"
          required
          defaultValue={listing?.furnishing ?? ""}
          {...aria("furnishing", fieldErrors)}
        >
          <option value="" disabled>
            {f.chooseFurnishing}
          </option>
          {FURNISHING_VALUES.map((v) => (
            <option key={v} value={v}>
              {f.furnishingOptions[v]}
            </option>
          ))}
        </select>
        {err("furnishing", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-gender">
          {f.genderPreference}
        </label>
        <select
          id="lf-gender"
          className="select"
          name="genderPreference"
          defaultValue={listing?.genderPreference ?? ""}
        >
          {GENDER_VALUES.map((v) => (
            <option key={v || "none"} value={v}>
              {v === ""
                ? f.genderOptions.none
                : f.genderOptions[v as "male" | "female" | "mixed"]}
            </option>
          ))}
        </select>
        <div className="help">{f.optional}</div>
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-available">
          {f.availableFrom}
        </label>
        <input
          id="lf-available"
          className="input"
          name="availableFrom"
          type="date"
          required
          defaultValue={listing?.availableFrom ?? ""}
          {...aria("availableFrom", fieldErrors)}
        />
        {err("availableFrom", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-minstay">
          {f.minStay}
        </label>
        <input
          id="lf-minstay"
          className="input"
          name="minStayMonths"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={sel(listing?.minStayMonths)}
          {...aria("minStayMonths", fieldErrors)}
        />
        <div className="help">{f.optional}</div>
        {err("minStayMonths", fieldErrors)}
      </div>

      {isUniversity ? (
        <div className="field">
          <label className="check-row" htmlFor="lf-oncampus">
            <input
              id="lf-oncampus"
              type="checkbox"
              name="onCampus"
              checked={onCampus}
              onChange={(e) => setOnCampus(e.target.checked)}
            />
            <span>{f.onCampusToggle}</span>
          </label>
          <div className="help">{f.onCampusHelp}</div>
        </div>
      ) : null}

      {onCampus ? (
        // Read-only summary — the location comes from the university record,
        // server-side. address/city/state inputs are intentionally NOT rendered
        // (the parse relaxes them and the data layer overwrites them).
        <div className="field listing-form-oncampus">
          <span className="label">{f.address}</span>
          <p className="listing-form-oncampus-note">
            {format(f.onCampusSummary, { university: universityName ?? "" })}
          </p>
        </div>
      ) : (
        <div className="field">
          <label className="label" htmlFor="lf-address">
            {f.address}
          </label>
          <input
            id="lf-address"
            className="input"
            name="address"
            type="text"
            required
            defaultValue={listing?.address ?? ""}
            {...aria("address", fieldErrors)}
          />
          {err("address", fieldErrors)}
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="lf-area">
          {f.area}
        </label>
        <select
          id="lf-area"
          className="select"
          name="areaId"
          required
          defaultValue={listing?.areaId ?? ""}
          {...aria("areaId", fieldErrors)}
        >
          <option value="" disabled>
            {f.chooseArea}
          </option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {err("areaId", fieldErrors)}
      </div>

      {onCampus ? null : (
        <>
          <div className="field">
            <label className="label" htmlFor="lf-city">
              {f.city}
            </label>
            <input
              id="lf-city"
              className="input"
              name="city"
              type="text"
              required
              defaultValue={listing?.city ?? ""}
              {...aria("city", fieldErrors)}
            />
            {err("city", fieldErrors)}
          </div>

          <div className="field">
            <label className="label" htmlFor="lf-state">
              {f.state}
            </label>
            <input
              id="lf-state"
              className="input"
              name="state"
              type="text"
              required
              defaultValue={listing?.state ?? ""}
              {...aria("state", fieldErrors)}
            />
            {err("state", fieldErrors)}
          </div>
        </>
      )}

      <fieldset className="field listing-form-group">
        <legend className="label">{f.amenities}</legend>
        <div className="help">{f.optional}</div>
        <div className="listing-form-checks" role="group">
          {AMENITY_VALUES.map((v) => (
            <label key={v} className="check-row">
              <input
                type="checkbox"
                name="amenities"
                value={v}
                defaultChecked={listing?.amenities.includes(v) ?? false}
              />
              <span>{dict.areas.amenityLabels[v]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="btn btn-primary btn-block auth-submit"
        disabled={pending}
      >
        {pending
          ? dict.common.saving
          : isEdit
            ? dict.common.saveChanges
            : f.createDraft}
      </button>
      <p className="help" style={{ marginTop: 12 }}>
        {f.draftNote}
      </p>
    </form>
  );
}
