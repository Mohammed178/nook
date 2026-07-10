"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export function ForgotPasswordForm({ dict }: { dict: Dictionary }) {
  const t = dict.auth;
  const searchParams = useSearchParams();
  // /auth/callback bounces here with ?expired=1 when a recovery link is
  // invalid or already used — surface why the user ended up back on this form.
  const expired = searchParams.get("expired") === "1";

  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordResetAction(fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <>
      <span className="auth-kicker">{t.forgotKicker}</span>
      <h2>{t.forgotTitle}</h2>
      <p className="auth-sub">{t.forgotSub}</p>

      {expired && !sent ? (
        <div className="auth-error" role="alert">{t.resetLinkInvalid}</div>
      ) : null}
      {error ? <div className="auth-error" role="alert">{error}</div> : null}

      {sent ? (
        <p className="auth-sub" role="status">{t.resetLinkSent}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="fp-email">
              {t.email}
            </label>
            <input
              id="fp-email"
              className="input force-ltr"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.emailPlaceholder}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block auth-submit"
            disabled={pending}
          >
            {pending ? t.sendingResetLink : t.sendResetLink}
          </button>
        </form>
      )}

      <div className="auth-bottom">
        <span>
          <Link href="/login">{t.backToLogin}</Link>
        </span>
      </div>
    </>
  );
}
