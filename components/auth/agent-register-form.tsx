"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { signUpAgentAction } from "@/app/agents/register/actions";

export function AgentRegisterForm() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signUpAgentAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/agents/pending");
      router.refresh();
    });
  }

  return (
    <>
      <span className="auth-kicker">For agents</span>
      <h2>Register your agency</h2>
      <p className="auth-sub">
        List student rentals on Nook. We verify every agent against the BOVAEP
        registry before your listings go live.
      </p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="agent-name">
            Full name
          </label>
          <input
            id="agent-name"
            className="input"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Aisha Rahman"
          />
          <div className="help">Shown on your listings and agent profile.</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-agency">
            Agency
          </label>
          <input
            id="agent-agency"
            className="input"
            name="agency"
            type="text"
            required
            autoComplete="organization"
            placeholder="Bangi Properties"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-bovaep">
            BOVAEP licence number
          </label>
          <input
            id="agent-bovaep"
            className="input"
            name="bovaep_licence"
            type="text"
            required
            placeholder="E(3)1234"
          />
          <div className="help">We check this against the public BOVAEP registry.</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-email">
            Login email
          </label>
          <input
            id="agent-email"
            className="input"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@agency.my"
          />
          <div className="help">You sign in with this address. Not shown publicly.</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-contact-email">
            Public contact email
          </label>
          <input
            id="agent-contact-email"
            className="input"
            name="contact_email"
            type="email"
            required
            placeholder="contact@agency.my"
          />
          <div className="help">Shown on your public agent profile and listings.</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-phone">
            Mobile (Malaysia)
          </label>
          <input
            id="agent-phone"
            className="input"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+60 12 345 6789"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-whatsapp">
            WhatsApp
          </label>
          <input
            id="agent-whatsapp"
            className="input"
            name="whatsapp"
            type="tel"
            required
            placeholder="+60 12 345 6789"
          />
          <div className="help">Where renters reach you. Can be the same as your mobile.</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-password">
            Password
          </label>
          <div className="pw-wrap">
            <input
              id="agent-password"
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
            <Link href="#">Privacy Policy</Link>, and confirm the BOVAEP licence above
            is mine.
          </span>
        </label>

        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={pending}
        >
          {pending ? "Submitting…" : "Submit for verification"}
        </button>
      </form>

      <div className="auth-bottom">
        <span>
          Already registered? <Link href="/login">Sign in</Link>
        </span>
        <span>
          Looking for a room?{" "}
          <Link href="/register">Create a student account</Link>
        </span>
      </div>
    </>
  );
}
