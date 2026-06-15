"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { signUpAgentAction } from "@/app/agents/register/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export function AgentRegisterForm({ dict }: { dict: Dictionary }) {
  const t = dict.agentAuth;
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
      <span className="auth-kicker">{t.kicker}</span>
      <h2>{t.title}</h2>
      <p className="auth-sub">{t.sub}</p>

      {error ? <div className="auth-error">{error}</div> : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="agent-name">
            {t.fullName}
          </label>
          <input
            id="agent-name"
            className="input"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder={t.fullNamePlaceholder}
          />
          <div className="help">{t.fullNameHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-agency">
            {t.agency}
          </label>
          <input
            id="agent-agency"
            className="input"
            name="agency"
            type="text"
            required
            autoComplete="organization"
            placeholder={t.agencyPlaceholder}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-bovaep">
            {t.bovaepLicence}
          </label>
          <input
            id="agent-bovaep"
            className="input force-ltr"
            name="bovaep_licence"
            type="text"
            required
            placeholder={t.bovaepPlaceholder}
          />
          <div className="help">{t.bovaepHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-email">
            {t.loginEmail}
          </label>
          <input
            id="agent-email"
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
          <label className="label" htmlFor="agent-contact-email">
            {t.publicEmail}
          </label>
          <input
            id="agent-contact-email"
            className="input force-ltr"
            name="contact_email"
            type="email"
            required
            placeholder={t.publicEmailPlaceholder}
          />
          <div className="help">{t.publicEmailHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-phone">
            {a.mobileMy}
          </label>
          <input
            id="agent-phone"
            className="input force-ltr"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={a.mobilePlaceholder}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-whatsapp">
            {t.whatsapp}
          </label>
          <input
            id="agent-whatsapp"
            className="input force-ltr"
            name="whatsapp"
            type="tel"
            required
            placeholder={a.mobilePlaceholder}
          />
          <div className="help">{t.whatsappHelp}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="agent-password">
            {a.password}
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
            {a.termsAgree} <Link href="#">{a.termsOfService}</Link> {a.and}{" "}
            <Link href="#">{a.privacyPolicy}</Link>{t.termsTail}
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
          {t.lookingForRoom}{" "}
          <Link href="/register">{a.createStudentAccount}</Link>
        </span>
      </div>
    </>
  );
}
