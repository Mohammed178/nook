"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { UniversitySearch } from "@/components/auth/university-search";
import { GenderPicker } from "@/components/account/gender-picker";
import { signUpAction } from "@/app/register/actions";

export function RegisterForm() {
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
      <h2>Create your student account</h2>
      <p className="auth-sub">
        Save rooms, message agents, and get alerts when something near your campus drops in
        price.
      </p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="reg-name">
            Display name
          </label>
          <input
            id="reg-name"
            className="input"
            name="display_name"
            type="text"
            required
            autoComplete="name"
            placeholder="Hidayah binti Kamarul"
          />
          <div className="help">Shown to agents when you message them.</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            className="input"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@uni.edu.my"
          />
          <div className="help">
            Use your university email if you have one — gets you a student verification
            badge.
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-phone">
            Mobile (Malaysia)
          </label>
          <input
            id="reg-phone"
            className="input"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+60 12 345 6789"
          />
        </div>

        <div className="field">
          <label className="label">University</label>
          <UniversitySearch name="university_id" />
        </div>

        <div className="field">
          <label className="label">Roommate preference</label>
          <GenderPicker name="gender_preference" ariaLabel="Roommate preference" />
          <div className="help">
            We&apos;ll prefer listings matching this. Change anytime in your profile.
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-password">
            Password
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
              placeholder="At least 8 characters"
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

        <label className="check-row">
          <input type="checkbox" name="terms" required />
          <span>
            I agree to Nook&apos;s <Link href="#">Terms of Service</Link> and{" "}
            <Link href="#">Privacy Policy</Link>. I understand Nook is a listing platform —
            agreements are between me and BOVAEP-licensed agents.
          </span>
        </label>

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={pending}
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="auth-bottom">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </>
  );
}
