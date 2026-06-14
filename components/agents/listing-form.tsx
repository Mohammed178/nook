"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Area, Listing } from "@/lib/types";
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

const TYPE_OPTIONS = [
  { value: "room", label: "Room" },
  { value: "studio", label: "Studio" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
];
const FURNISHING_OPTIONS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "partial", label: "Partially furnished" },
  { value: "full", label: "Fully furnished" },
];
const GENDER_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "mixed", label: "Mixed" },
];

// Amenity tokens drawn from the seed listings. No amenities table exists, so the
// option list is a small constant (4b scope).
const AMENITY_OPTIONS: { value: string; label: string }[] = [
  { value: "wifi", label: "Wifi" },
  { value: "aircon", label: "Air-conditioning" },
  { value: "washer", label: "Washer" },
  { value: "kitchen", label: "Kitchen" },
  { value: "shared-kitchen", label: "Shared kitchen" },
  { value: "parking", label: "Parking" },
  { value: "pool", label: "Pool" },
  { value: "gym", label: "Gym" },
  { value: "garden", label: "Garden" },
  { value: "security", label: "Security" },
  { value: "concierge", label: "Concierge" },
];

interface ListingFormProps {
  areas: Area[];
  // Present → edit mode (fields pre-filled, submits an update); absent → create.
  listing?: Listing;
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

export function ListingForm({ areas, listing }: ListingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(listing);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

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
          Title
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
          Property type
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
            Choose a type
          </option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {err("type", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-description">
          Description
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
          Monthly price (RM)
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
          Deposit (RM)
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
        <div className="help">Optional.</div>
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
          <span>Utilities included in rent</span>
        </label>
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-bedrooms">
          Bedrooms
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
          Bathrooms
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
          Size (sq ft)
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
        <div className="help">Optional.</div>
        {err("sizeSqft", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-furnishing">
          Furnishing
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
            Choose a furnishing level
          </option>
          {FURNISHING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {err("furnishing", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-gender">
          Gender preference
        </label>
        <select
          id="lf-gender"
          className="select"
          name="genderPreference"
          defaultValue={listing?.genderPreference ?? ""}
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="help">Optional.</div>
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-available">
          Available from
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
          Minimum stay (months)
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
        <div className="help">Optional.</div>
        {err("minStayMonths", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-address">
          Address
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

      <div className="field">
        <label className="label" htmlFor="lf-area">
          Area
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
            Choose an area
          </option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {err("areaId", fieldErrors)}
      </div>

      <div className="field">
        <label className="label" htmlFor="lf-city">
          City
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
          State
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

      <fieldset className="field listing-form-group">
        <legend className="label">Amenities</legend>
        <div className="help">Optional.</div>
        <div className="listing-form-checks" role="group">
          {AMENITY_OPTIONS.map((o) => (
            <label key={o.value} className="check-row">
              <input
                type="checkbox"
                name="amenities"
                value={o.value}
                defaultChecked={listing?.amenities.includes(o.value) ?? false}
              />
              <span>{o.label}</span>
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
          ? "Saving…"
          : isEdit
            ? "Save changes"
            : "Create draft"}
      </button>
      <p className="help" style={{ marginTop: 12 }}>
        New listings are saved as a private draft. Photos and publishing come
        next.
      </p>
    </form>
  );
}
