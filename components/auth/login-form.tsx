"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { signInAction } from "@/app/login/actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/account";

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("redirect", redirectTo);
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
      <h2>Sign in</h2>
      <p className="auth-sub">
        Pick up where you left off — saved rooms, agent threads, and your shortlist.
      </p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="input"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@uni.edu.my"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="login-password">
            Password
          </label>
          <div className="pw-wrap">
            <input
              id="login-password"
              className="input"
              name="password"
              type={showPw ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Your password"
            />
            <button
              type="button"
              className="toggle-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="auth-bottom">
        New to Nook? <Link href="/register">Create a student account</Link>
      </div>
    </>
  );
}
