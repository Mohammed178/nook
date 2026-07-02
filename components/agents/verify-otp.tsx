"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import {
  requestPhoneOtpAction,
  verifyPhoneOtpAction,
} from "@/app/agents/verify/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface Props {
  dict: Dictionary;
  initialPhone: string;
  phoneVerified: boolean;
  onVerified: () => void;
}

// Two-stage UX: (1) phone entry + "Send code" button → POST request_phone_otp;
// the OtpProvider (mock in dev) logs the code server-side. (2) Code entry +
// "Verify" → POST verify_phone_otp. Already-verified state is a static "✓"
// (phone_verified is server-truth via the initial render).
//
// The MockOtpProvider prints the code to the dev terminal. Demo operator
// reads it from `npm run dev` output.
export function VerifyOtp({
  dict,
  initialPhone,
  phoneVerified,
  onVerified,
}: Props) {
  const t = dict.agentVerify;

  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [requesting, startRequest] = useTransition();
  const [verifying, startVerify] = useTransition();

  if (phoneVerified) {
    return (
      <div className="verify-otp-done" role="status">
        <Icon name="check" size={16} />
        <span>{t.phoneAlreadyVerified}</span>
      </div>
    );
  }

  function onRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRequestError(null);
    const fd = new FormData(e.currentTarget);
    startRequest(async () => {
      const result = await requestPhoneOtpAction(fd);
      if (!result.ok) {
        setRequestError(result.error ?? t.errCouldNotSendOtp);
        return;
      }
      setSent(true);
    });
  }

  function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVerifyError(null);
    const fd = new FormData(e.currentTarget);
    startVerify(async () => {
      const result = await verifyPhoneOtpAction(fd);
      if (!result.ok) {
        setVerifyError(result.error ?? t.errOtpMismatch);
        return;
      }
      onVerified();
    });
  }

  return (
    <div className="verify-otp">
      <form onSubmit={onRequest} className="verify-otp-request">
        <div className="field">
          <label className="label" htmlFor="verify-otp-phone">
            {t.phoneLabel}
          </label>
          <input
            id="verify-otp-phone"
            className="input force-ltr"
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+60 12 345 6789"
          />
          <div className="help">{t.phoneHelp}</div>
        </div>
        {requestError ? <div className="auth-error">{requestError}</div> : null}
        <button type="submit" className="btn btn-primary" disabled={requesting}>
          {requesting ? t.sending : sent ? t.sendAgain : t.sendCode}
        </button>
        {sent ? (
          <p className="verify-otp-hint">
            <Icon name="mail" size={14} />
            <span>{t.codeSentHint}</span>
          </p>
        ) : null}
      </form>

      {sent ? (
        <form onSubmit={onVerify} className="verify-otp-check">
          <div className="field">
            <label className="label" htmlFor="verify-otp-code">
              {t.codeLabel}
            </label>
            <input
              id="verify-otp-code"
              className="input force-ltr tabular"
              type="text"
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <div className="help">{t.codeHelp}</div>
          </div>
          {verifyError ? <div className="auth-error">{verifyError}</div> : null}
          <button type="submit" className="btn btn-primary" disabled={verifying}>
            {verifying ? t.verifying : t.verifyCode}
          </button>
        </form>
      ) : null}
    </div>
  );
}
