"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { MALAYSIAN_STATES } from "@/lib/seed/malaysian-states";
import {
  saveLicenceStepAction,
  submitVerificationAction,
} from "@/app/agents/verify/actions";
import { VerifyDocumentUpload } from "@/components/agents/verify-document-upload";
import { VerifyOtp } from "@/components/agents/verify-otp";
import { VerifyConsent } from "@/components/agents/verify-consent";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { AgentDocument } from "@/lib/data/agent-verification";

interface AgentSnapshot {
  id: string;
  name: string;
  phone: string;
  agency: string;
  bovaepLicence: string;
  licenceType: "REN" | "REA" | "PEA" | null;
  practisingState: string | null;
  phoneVerified: boolean;
  verificationSubmittedAt: string | null;
}

interface Props {
  dict: Dictionary;
  agent: AgentSnapshot;
  initialDocuments: AgentDocument[];
  acceptedTerms: boolean;
  termsVersion: string;
}

// A11y / WCAG 2.2 AA (delta D7): every progress chip carries an icon glyph
// (check / dash) AND a text label — no color-only state. Terracotta lives on
// headings/buttons/icons only via CSS (.verify-chip-ok), never as the sole
// signal.
type ChipState = "ok" | "missing";

function Chip({
  state,
  label,
  ariaLabel,
}: {
  state: ChipState;
  label: string;
  ariaLabel?: string;
}) {
  return (
    <span
      className={`verify-chip verify-chip-${state}`}
      aria-label={ariaLabel ?? `${label}: ${state === "ok" ? "done" : "missing"}`}
    >
      <Icon name={state === "ok" ? "check" : "x"} size={12} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function VerifyStepper({
  dict,
  agent,
  initialDocuments,
  acceptedTerms: initialAcceptedTerms,
  termsVersion,
}: Props) {
  const t = dict.agentVerify;
  const router = useRouter();

  const [licenceType, setLicenceType] = useState(agent.licenceType ?? "");
  const [practisingState, setPractisingState] = useState(
    agent.practisingState ?? "",
  );
  const [bovaepLicence, setBovaepLicence] = useState(agent.bovaepLicence);
  const [licenceSaved, setLicenceSaved] = useState(
    !!agent.licenceType && !!agent.practisingState,
  );
  const [licenceError, setLicenceError] = useState<string | null>(null);
  const [licenceSaving, startLicenceSave] = useTransition();

  const [documents, setDocuments] = useState<AgentDocument[]>(initialDocuments);
  const [phoneVerified, setPhoneVerified] = useState(agent.phoneVerified);
  const [acceptedTerms, setAcceptedTerms] = useState(initialAcceptedTerms);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [submitted, setSubmitted] = useState(!!agent.verificationSubmittedAt);

  const docsOk = documents.length >= 1;
  const licenceOk = !!licenceType && !!practisingState && bovaepLicence.length >= 4;
  const allReady =
    licenceOk && docsOk && phoneVerified && acceptedTerms;

  function onSaveLicence(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLicenceError(null);
    const fd = new FormData(e.currentTarget);
    startLicenceSave(async () => {
      const result = await saveLicenceStepAction(fd);
      if (result?.error) {
        setLicenceError(result.error);
        return;
      }
      setLicenceSaved(true);
    });
  }

  function onSubmit() {
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitVerificationAction();
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      setSubmitted(true);
      router.push("/agents/pending");
      router.refresh();
    });
  }

  if (submitted) {
    return (
      <div className="verify-submitted">
        <Icon name="check" size={28} />
        <h2>{t.submittedTitle}</h2>
        <p>{t.submittedBody}</p>
      </div>
    );
  }

  return (
    <div className="verify-shell">
      <aside className="verify-progress" aria-label={t.progressAria}>
        <Chip state={licenceOk ? "ok" : "missing"} label={t.chipLicence} />
        <Chip state={docsOk ? "ok" : "missing"} label={t.chipDocs} />
        <Chip state={phoneVerified ? "ok" : "missing"} label={t.chipPhone} />
        <Chip state={acceptedTerms ? "ok" : "missing"} label={t.chipTerms} />
      </aside>

      <ol className="verify-steps">
        {/* Step 1: licence */}
        <li className="verify-step">
          <header>
            <span className="verify-step-num" aria-hidden>1</span>
            <h2>{t.step1Title}</h2>
          </header>
          <p className="verify-step-sub">{t.step1Sub}</p>
          {licenceError ? <div className="auth-error">{licenceError}</div> : null}
          <form onSubmit={onSaveLicence} noValidate>
            <div className="field">
              <label className="label" htmlFor="verify-licence-type">
                {t.licenceTypeLabel}
              </label>
              <select
                id="verify-licence-type"
                className="input"
                name="licence_type"
                required
                value={licenceType}
                onChange={(e) => setLicenceType(e.target.value)}
              >
                <option value="">{t.licenceTypePlaceholder}</option>
                <option value="REN">REN — {t.licenceRenSub}</option>
                <option value="REA">REA — {t.licenceReaSub}</option>
                <option value="PEA">PEA — {t.licencePeaSub}</option>
              </select>
              <div className="help">{t.licenceTypeHelp}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="verify-state">
                {t.practisingStateLabel}
              </label>
              <select
                id="verify-state"
                className="input"
                name="practising_state"
                required
                value={practisingState}
                onChange={(e) => setPractisingState(e.target.value)}
              >
                <option value="">{t.practisingStatePlaceholder}</option>
                {MALAYSIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="help">{t.practisingStateHelp}</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="verify-bovaep">
                {t.bovaepLabel}
              </label>
              <input
                id="verify-bovaep"
                className="input force-ltr"
                name="bovaep_licence"
                type="text"
                value={bovaepLicence}
                onChange={(e) => setBovaepLicence(e.target.value)}
                placeholder="E(3)1234"
              />
              <div className="help">{t.bovaepHelp}</div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={licenceSaving}
            >
              {licenceSaving ? t.saving : licenceSaved ? t.update : t.save}
            </button>
            {licenceSaved ? (
              <span className="verify-saved" role="status">
                <Icon name="check" size={14} /> {t.savedOk}
              </span>
            ) : null}
          </form>
        </li>

        {/* Step 2: documents */}
        <li className="verify-step">
          <header>
            <span className="verify-step-num" aria-hidden>2</span>
            <h2>{t.step2Title}</h2>
          </header>
          <p className="verify-step-sub">{t.step2Sub}</p>
          <VerifyDocumentUpload
            dict={dict}
            agentId={agent.id}
            initialDocuments={documents}
            onDocumentAdded={(d) => setDocuments((prev) => [d, ...prev])}
          />
        </li>

        {/* Step 3: phone */}
        <li className="verify-step">
          <header>
            <span className="verify-step-num" aria-hidden>3</span>
            <h2>{t.step3Title}</h2>
          </header>
          <p className="verify-step-sub">{t.step3Sub}</p>
          <VerifyOtp
            dict={dict}
            initialPhone={agent.phone}
            phoneVerified={phoneVerified}
            onVerified={() => setPhoneVerified(true)}
          />
        </li>

        {/* Step 4: consent */}
        <li className="verify-step">
          <header>
            <span className="verify-step-num" aria-hidden>4</span>
            <h2>{t.step4Title}</h2>
          </header>
          <p className="verify-step-sub">{t.step4Sub}</p>
          <VerifyConsent
            dict={dict}
            accepted={acceptedTerms}
            termsVersion={termsVersion}
            onAccepted={() => setAcceptedTerms(true)}
          />
        </li>

        {/* Step 5: submit */}
        <li className="verify-step">
          <header>
            <span className="verify-step-num" aria-hidden>5</span>
            <h2>{t.step5Title}</h2>
          </header>
          <p className="verify-step-sub">{t.step5Sub}</p>
          {submitError ? <div className="auth-error">{submitError}</div> : null}
          <ul className="verify-precondition-list">
            <li>
              <Chip
                state={licenceOk ? "ok" : "missing"}
                label={t.chipLicence}
              />
            </li>
            <li>
              <Chip state={docsOk ? "ok" : "missing"} label={t.chipDocs} />
            </li>
            <li>
              <Chip
                state={phoneVerified ? "ok" : "missing"}
                label={t.chipPhone}
              />
            </li>
            <li>
              <Chip
                state={acceptedTerms ? "ok" : "missing"}
                label={t.chipTerms}
              />
            </li>
          </ul>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={onSubmit}
            disabled={!allReady || submitting}
          >
            {submitting ? t.submitting : t.submitFinal}
          </button>
        </li>
      </ol>
    </div>
  );
}
