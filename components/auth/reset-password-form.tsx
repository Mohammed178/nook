"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { updatePasswordAction } from "@/app/reset-password/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export function ResetPasswordForm({ dict }: { dict: Dictionary }) {
  const t = dict.auth;
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePasswordAction(fd);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.push("/account");
      router.refresh();
    });
  }

  return (
    <>
      <span className="auth-kicker">{t.resetKicker}</span>
      <h2>{t.resetTitle}</h2>
      <p className="auth-sub">{t.resetSub}</p>

      {error ? <div className="auth-error" role="alert">{error}</div> : null}

      {done ? (
        <p className="auth-sub" role="status">{t.passwordUpdated}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="rp-password">
              {t.newPassword}
            </label>
            <div className="pw-wrap">
              <input
                id="rp-password"
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

          <button
            type="submit"
            className="btn btn-primary btn-block auth-submit"
            disabled={pending}
          >
            {pending ? t.updatingPassword : t.updatePassword}
          </button>
        </form>
      )}
    </>
  );
}
