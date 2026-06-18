"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { UniversitySearch } from "@/components/auth/university-search";
import { GenderPicker } from "@/components/account/gender-picker";
import { signUpAction } from "@/app/register/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { University } from "@/lib/types";

export function RegisterForm({
  dict,
  universities,
}: {
  dict: Dictionary;
  universities: University[];
}) {
  const t = dict.auth;
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signUpAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/account");
      router.refresh();
    });
  }

  return (
    <>
      <span className="auth-kicker">{t.registerKicker}</span>
      <h2>{t.registerTitle}</h2>
      <p className="auth-sub">{t.registerSub}</p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="reg-name">
            {t.displayName}
          </label>
          <input
            id="reg-name"
            className="input"
            name="display_name"
            type="text"
            required
            autoComplete="name"
            placeholder={t.displayNamePlaceholder}
          />
          <div className="help">{t.displayNameHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-email">
            {t.email}
          </label>
          <input
            id="reg-email"
            className="input force-ltr"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailPlaceholder}
          />
          <div className="help">{t.emailHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-phone">
            {t.mobileMy}
          </label>
          <input
            id="reg-phone"
            className="input force-ltr"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t.mobilePlaceholder}
          />
        </div>

        <div className="field">
          <label className="label">{t.university}</label>
          <UniversitySearch name="university_id" universities={universities} />
        </div>

        <div className="field">
          <label className="label">{t.roommatePreference}</label>
          <GenderPicker name="gender_preference" ariaLabel={t.roommatePreference} />
          <div className="help">{t.roommateHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-password">
            {t.password}
          </label>
          <div className="pw-wrap">
            <input
              id="reg-password"
              className="input"
              name="password"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t.passwordMinPlaceholder}
            />
            <button
              type="button"
              className="toggle-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? t.hidePassword : t.showPassword}
            >
              <Icon name={showPw ? "eye-off" : "eye"} size={16} />
            </button>
          </div>
        </div>

        <label className="check-row">
          <input type="checkbox" name="terms" required />
          <span>
            {t.termsAgree} <Link href="#">{t.termsOfService}</Link> {t.and}{" "}
            <Link href="#">{t.privacyPolicy}</Link>{t.termsTail}
          </span>
        </label>

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={pending}
        >
          {pending ? t.creatingAccount : t.createAccount}
        </button>
      </form>

      <div className="auth-bottom">
        <span>
          {t.alreadyHaveAccount} <Link href="/login">{t.signIn}</Link>
        </span>
        <span>
          {t.wantToList}{" "}
          <Link href="/agents/register">{t.registerAsAgent}</Link>
        </span>
      </div>
    </>
  );
}
