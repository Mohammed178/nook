"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { UniversitySearch } from "@/components/auth/university-search";
import { GenderPicker } from "@/components/account/gender-picker";
import { updateProfileAction } from "@/app/account/profile/actions";

interface ProfileInitial {
  display_name: string;
  email: string;
  phone: string;
  country: string;
  university_id: string;
  gender_preference: string;
}

interface ProfileFormProps {
  initial: ProfileInitial;
}

const PHONE_PREFIX = "+60";

function stripPrefix(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith(PHONE_PREFIX)) return trimmed.slice(PHONE_PREFIX.length).trim();
  return trimmed;
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (savedAt === null) return;
    const id = window.setTimeout(() => setSavedAt(null), 3000);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  useEffect(() => {
    if (!dirty || pending) return;
    function onBefore(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty, pending]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const phoneRaw = String(fd.get("phone_local") ?? "").trim();
    const phoneFull = phoneRaw ? `${PHONE_PREFIX} ${phoneRaw}` : "";
    fd.set("phone", phoneFull);
    fd.delete("phone_local");
    startTransition(async () => {
      const result = await updateProfileAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
      setDirty(false);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => {
        if (!dirty) setDirty(true);
      }}
      className="profile-form"
      noValidate
    >
      {error ? <div className="auth-error" role="alert">{error}</div> : null}

      <fieldset className="profile-section">
        <legend className="profile-legend">Identity</legend>
        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="pf-name">Display name</label>
            <input
              id="pf-name"
              className="input"
              name="display_name"
              type="text"
              required
              autoComplete="name"
              defaultValue={initial.display_name}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-email">Email</label>
            <div className="profile-email-wrap">
              <input
                id="pf-email"
                className="input profile-email-input"
                name="email"
                type="email"
                value={initial.email}
                disabled
                aria-describedby="pf-email-help"
              />
              <Icon name="lock" size={14} className="profile-email-lock" aria-hidden="true" />
            </div>
            <div className="help" id="pf-email-help">
              Email change requires verification, coming later.
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="profile-section">
        <legend className="profile-legend">Contact</legend>
        <div className="profile-row">
          <div className="field">
            <label className="label" htmlFor="pf-phone">Mobile</label>
            <div className="profile-prefix-wrap">
              <span className="profile-prefix" aria-hidden="true">{PHONE_PREFIX}</span>
              <input
                id="pf-phone"
                className="input profile-prefix-input"
                name="phone_local"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="12 345 6789"
                defaultValue={stripPrefix(initial.phone)}
                aria-describedby="pf-phone-help"
              />
            </div>
            <div className="help" id="pf-phone-help">
              For agent contact only, not shown publicly.
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-country">Country</label>
            <input
              id="pf-country"
              className="input"
              name="country"
              type="text"
              autoComplete="country-name"
              defaultValue={initial.country}
              aria-describedby="pf-country-help"
            />
            <div className="help" id="pf-country-help">
              Where you're from, for agent context.
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="profile-section">
        <legend className="profile-legend">Preferences</legend>
        <div className="field">
          <label className="label" htmlFor="pf-university">University</label>
          <UniversitySearch name="university_id" defaultValue={initial.university_id} />
          <div className="help">Used to compute walk-minutes to campus.</div>
        </div>
        <div className="field">
          <span className="label">Roommate preference</span>
          <GenderPicker
            name="gender_preference"
            defaultValue={initial.gender_preference}
            ariaLabel="Roommate preference"
          />
          <div className="help">Filters listings to match your preferred mix.</div>
        </div>
      </fieldset>

      <div className="profile-form-actions">
        <button
          type="submit"
          className={`btn btn-primary${dirty && !pending ? " is-dirty" : ""}`}
          disabled={pending}
          aria-describedby={dirty && !pending ? "pf-dirty-hint" : undefined}
        >
          {dirty && !pending ? (
            <span className="profile-dirty-dot" aria-hidden="true" />
          ) : null}
          {pending ? "Saving…" : "Save changes"}
        </button>
        {dirty && !pending ? (
          <span id="pf-dirty-hint" className="profile-dirty-hint">
            Unsaved changes
          </span>
        ) : null}
        <span className="profile-save-chip" role="status" aria-live="polite">
          {savedAt !== null ? (
            <span className="profile-save-chip-inner" data-visible="true">
              <Icon name="check" size={14} aria-hidden="true" /> Saved
            </span>
          ) : null}
        </span>
      </div>
    </form>
  );
}
