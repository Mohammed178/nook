"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { signUpUniversityAction } from "@/app/universities/register/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// A university's picklist entry. The value submitted is the UUID `id` (the FK
// target) — NOT the slug. getAllUniversities() raw records carry the UUID;
// toSearchUniversities would remap id→slug, which would break the FK insert.
export interface UniversityOption {
  id: string;
  name: string;
  shortName: string;
}

// Sibling of AgentRegisterForm — universities never touch BOVAEP/licence, so
// this is a separate form rather than a mode on the agent one. Reuses the same
// auth-shell CSS idioms (field/label/input/help/check-row/auth-*).
export function UniversityRegisterForm({
  dict,
  universities,
}: {
  dict: Dictionary;
  universities: UniversityOption[];
}) {
  const t = dict.universityAuth;
  const a = dict.auth;
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signUpUniversityAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Universities skip the licence/OTP verify stepper entirely — straight to
      // the read-only pending status view.
      router.push("/agents/pending");
      router.refresh();
    });
  }

  return (
    <>
      <span className="auth-kicker">{t.kicker}</span>
      <h2>{t.title}</h2>
      <p className="auth-sub">{t.sub}</p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="uni-id">
            {t.universityLabel}
          </label>
          <select id="uni-id" className="input" name="university_id" required defaultValue="">
            <option value="" disabled>
              {t.universityPlaceholder}
            </option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <div className="help">{t.universityHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-name">
            {t.displayName}
          </label>
          <input
            id="uni-name"
            className="input"
            name="name"
            type="text"
            required
            placeholder={t.displayNamePlaceholder}
          />
          <div className="help">{t.displayNameHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-contact-name">
            {t.contactName}
          </label>
          <input
            id="uni-contact-name"
            className="input"
            name="contact_person_name"
            type="text"
            required
            autoComplete="name"
            placeholder={t.contactNamePlaceholder}
          />
          <div className="help">{t.contactNameHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-contact-role">
            {t.contactRole}
          </label>
          <input
            id="uni-contact-role"
            className="input"
            name="contact_person_role"
            type="text"
            required
            placeholder={t.contactRolePlaceholder}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-phone">
            {t.officialPhone}
          </label>
          <input
            id="uni-phone"
            className="input force-ltr"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={a.mobilePlaceholder}
          />
          <div className="help">{t.officialPhoneHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-whatsapp">
            {t.whatsapp}
          </label>
          <input
            id="uni-whatsapp"
            className="input force-ltr"
            name="whatsapp"
            type="tel"
            required
            placeholder={a.mobilePlaceholder}
          />
          <div className="help">{t.whatsappHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-contact-email">
            {t.publicEmail}
          </label>
          <input
            id="uni-contact-email"
            className="input force-ltr"
            name="contact_email"
            type="email"
            required
            placeholder={t.publicEmailPlaceholder}
          />
          <div className="help">{t.publicEmailHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-notes">
            {t.notes}
          </label>
          <textarea
            id="uni-notes"
            className="input"
            name="application_notes"
            rows={3}
            placeholder={t.notesPlaceholder}
          />
          <div className="help">{t.notesHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-email">
            {t.loginEmail}
          </label>
          <input
            id="uni-email"
            className="input force-ltr"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.loginEmailPlaceholder}
          />
          <div className="help">{t.loginEmailHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="uni-password">
            {a.password}
          </label>
          <div className="pw-wrap">
            <input
              id="uni-password"
              className="input"
              name="password"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={a.passwordMinPlaceholder}
            />
            <button
              type="button"
              className="toggle-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? a.hidePassword : a.showPassword}
            >
              <Icon name={showPw ? "eye-off" : "eye"} size={16} />
            </button>
          </div>
        </div>

        <label className="check-row">
          <input type="checkbox" name="terms" required />
          <span>
            {a.termsAgree} <Link href="/terms">{a.termsOfService}</Link> {a.and}{" "}
            <Link href="/privacy">{a.privacyPolicy}</Link>
            {t.termsTail}
          </span>
        </label>

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={pending}
        >
          {pending ? t.submitting : t.submit}
        </button>
      </form>

      <div className="auth-bottom">
        <span>
          {t.alreadyRegistered} <Link href="/login">{a.signIn}</Link>
        </span>
        <span>
          {t.areYouAnAgent} <Link href="/agents/register">{t.registerAsAgent}</Link>
        </span>
      </div>
    </>
  );
}
