"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { signInAction } from "@/app/login/actions";
import { safeRedirectPath } from "@/lib/safe-redirect";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export function LoginForm({ dict }: { dict: Dictionary }) {
  const t = dict.auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signInAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <span className="auth-kicker">{t.loginKicker}</span>
      <h2>{t.loginTitle}</h2>
      <p className="auth-sub">{t.loginSub}</p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="login-email">
            {t.email}
          </label>
          <input
            id="login-email"
            className="input force-ltr"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailPlaceholder}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="login-password">
            {t.password}
          </label>
          <div className="pw-wrap">
            <input
              id="login-password"
              className="input"
              name="password"
              type={showPw ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder={t.passwordPlaceholder}
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

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={pending}
        >
          {pending ? t.signingIn : t.signIn}
        </button>
      </form>

      <div className="auth-bottom">
        <span>
          {t.newToNook} <Link href="/register">{t.createStudentAccount}</Link>
        </span>
        <span>
          {t.wantToList}{" "}
          <Link href="/agents/register">{t.registerAsAgent}</Link>
        </span>
      </div>
    </>
  );
}
