"use client";

import { useState, useTransition } from "react";
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

export function ProfileForm({ initial }: ProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="profile-form" noValidate>
      {error ? <div className="auth-error">{error}</div> : null}
      {success ? <div className="profile-success">Saved.</div> : null}

      <div className="field">
        <label className="label" htmlFor="pf-name">
          Display name
        </label>
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
        <label className="label" htmlFor="pf-email">
          Email
        </label>
        <input
          id="pf-email"
          className="input"
          name="email"
          type="email"
          value={initial.email}
          disabled
          aria-describedby="pf-email-help"
        />
        <div className="help" id="pf-email-help">
          Email change requires verification — coming later.
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="pf-phone">
          Mobile
        </label>
        <input
          id="pf-phone"
          className="input"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+60 12 345 6789"
          defaultValue={initial.phone}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="pf-country">
          Country
        </label>
        <input
          id="pf-country"
          className="input"
          name="country"
          type="text"
          autoComplete="country-name"
          placeholder="Malaysia"
          defaultValue={initial.country}
        />
      </div>

      <div className="field">
        <label className="label">University</label>
        <UniversitySearch name="university_id" defaultValue={initial.university_id} />
      </div>

      <div className="field">
        <label className="label">Roommate preference</label>
        <GenderPicker
          name="gender_preference"
          defaultValue={initial.gender_preference}
          ariaLabel="Roommate preference"
        />
      </div>

      <div className="profile-form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
