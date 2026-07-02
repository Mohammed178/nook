"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { recordTermsConsentAction } from "@/app/agents/verify/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface Props {
  dict: Dictionary;
  accepted: boolean;
  termsVersion: string;
  onAccepted: () => void;
}

export function VerifyConsent({
  dict,
  accepted: initialAccepted,
  termsVersion,
  onAccepted,
}: Props) {
  const t = dict.agentVerify;
  const [accepted, setAccepted] = useState(initialAccepted);
  const [checked, setChecked] = useState(initialAccepted);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  if (accepted) {
    return (
      <div className="verify-otp-done" role="status">
        <Icon name="check" size={16} />
        <span>{t.termsAlreadyAccepted}</span>
      </div>
    );
  }

  function submit() {
    if (!checked) {
      setError(t.errMustCheckTerms);
      return;
    }
    setError(null);
    startSave(async () => {
      const result = await recordTermsConsentAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAccepted(true);
      onAccepted();
    });
  }

  return (
    <div className="verify-consent">
      <p className="verify-consent-version">
        {t.termsVersionLabel}: <span className="tabular">{termsVersion}</span>
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>{t.termsBody}</span>
      </label>
      {error ? <div className="auth-error">{error}</div> : null}
      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={saving}
      >
        {saving ? t.saving : t.acceptTerms}
      </button>
    </div>
  );
}
