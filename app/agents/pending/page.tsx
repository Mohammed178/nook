import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import {
  getAgentConsentsForCurrentUser,
  getAgentDocumentsForCurrentUser,
} from "@/lib/data/agent-verification";
import { signOutAction } from "@/app/account/actions";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { LOCALE_DATE_TAG, type Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.applicationStatus };
}

function formatSubmitted(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "long",
  }).format(d);
}

export default async function AgentPendingPage() {
  const [user, dict, locale] = await Promise.all([
    getCurrentUser(),
    getDictionary(),
    getLocale(),
  ]);
  if (!user) redirect("/login"); // also enforced by middleware
  const t = dict.agents;
  const v = dict.agentVerify;

  const agent = await getAgentByUserId(user.id);
  if (!agent) redirect("/"); // student / non-agent
  if (agent.deletedAt) redirect("/"); // F4, withdrawn (soft-deleted)
  if (agent.status === "approved") redirect("/"); // approved → away

  const rejected = agent.status === "rejected";
  const submitted = formatSubmitted(agent.submittedAt!, locale);

  // Verification progress (only computed for pending, the rejected branch
  // doesn't surface it — reapply path is separate, not in this seal).
  const [docs, consents] = rejected
    ? [[], []]
    : await Promise.all([
        getAgentDocumentsForCurrentUser(),
        getAgentConsentsForCurrentUser(),
      ]);
  const licenceOk =
    !!agent.licenceType && !!agent.practisingState && !!agent.bovaepLicence;
  const docsOk = docs.length >= 1;
  const phoneOk = agent.phoneVerified === true;
  const termsOk = consents.some((c) => c.consentType === "verified_agent_terms");
  const allReady = licenceOk && docsOk && phoneOk && termsOk;
  const verificationSubmitted = !!agent.verificationSubmittedAt;

  return (
    <div className="auth-shell auth-status-shell">
      <main className="auth-form auth-status">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} strokeWidth={1.7} className="rtl-flip" />
          {dict.auth.backToHome}
        </Link>

        <span className="auth-kicker">{t.agentApplication}</span>
        <span
          className={`pill ${rejected ? "pill-rejected" : "pill-pending"} auth-status-pill`}
        >
          {rejected
            ? t.applicationRejected
            : verificationSubmitted
              ? t.underReview
              : t.finishVerification}
        </span>

        {rejected ? (
          <>
            <h2>{t.applicationRejected}</h2>
            <p className="auth-status-meta">{format(t.submitted, { date: submitted })}</p>
            <p>
              {t.rejectedBody}
              {agent.statusReason
                ? format(t.rejectedReason, { reason: agent.statusReason })
                : ""}
            </p>
            <p>{t.reapplyBody}</p>
            <div className="verify-cta-row">
              <Link href="/" className="btn btn-secondary verify-cta">
                {t.continueToHome}
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Copy is honest about the actual state: before the final
                verification submit this is a to-do list, not a review queue.
                "Under review" only once verification_submitted_at is set. */}
            <h2>{verificationSubmitted ? t.underReview : t.finishVerification}</h2>
            {/* "Submitted" is only true once the final verification submit
                happened; before that the date is just account creation. */}
            <p className="auth-status-meta">
              {format(verificationSubmitted ? t.submitted : t.memberSince, {
                date: submitted,
              })}
            </p>
            <p>
              {format(
                verificationSubmitted ? t.underReviewBody : t.finishVerificationBody,
                { date: submitted, email: agent.email ?? "" },
              )}
            </p>

            <section className="verify-status-block" aria-label={v.progressAria}>
              <h3 className="verify-status-h">{v.statusHeading}</h3>
              <ul className="verify-status-chips">
                <li>
                  <span
                    className={`verify-chip verify-chip-${licenceOk ? "ok" : "missing"}`}
                  >
                    <Icon name={licenceOk ? "check" : "x"} size={12} aria-hidden />
                    <span>{v.chipLicence}</span>
                  </span>
                </li>
                <li>
                  <span
                    className={`verify-chip verify-chip-${docsOk ? "ok" : "missing"}`}
                  >
                    <Icon name={docsOk ? "check" : "x"} size={12} aria-hidden />
                    <span>{v.chipDocs}</span>
                  </span>
                </li>
                <li>
                  <span
                    className={`verify-chip verify-chip-${phoneOk ? "ok" : "missing"}`}
                  >
                    <Icon name={phoneOk ? "check" : "x"} size={12} aria-hidden />
                    <span>{v.chipPhone}</span>
                  </span>
                </li>
                <li>
                  <span
                    className={`verify-chip verify-chip-${termsOk ? "ok" : "missing"}`}
                  >
                    <Icon name={termsOk ? "check" : "x"} size={12} aria-hidden />
                    <span>{v.chipTerms}</span>
                  </span>
                </li>
              </ul>
              {verificationSubmitted ? (
                <p className="verify-status-msg">{v.statusSubmittedBody}</p>
              ) : null}
              <div className="verify-cta-row">
                {verificationSubmitted ? null : (
                  <Link href="/agents/verify" className="btn btn-primary verify-cta">
                    {allReady ? v.statusReviewCta : v.statusContinueCta}
                  </Link>
                )}
                {/* Browsing stays open while the application is in flight —
                    explicit way out instead of only the back-link up top. */}
                <Link href="/" className="btn btn-secondary verify-cta">
                  {t.continueToHome}
                </Link>
              </div>
            </section>
          </>
        )}

        <form action={signOutAction} className="auth-status-logout">
          <button type="submit" className="auth-status-logout-btn">
            {t.logOut}
          </button>
        </form>
      </main>
    </div>
  );
}
