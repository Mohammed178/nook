import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
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

  const agent = await getAgentByUserId(user.id);
  if (!agent) redirect("/"); // student / non-agent
  if (agent.deletedAt) redirect("/"); // F4, withdrawn/removed (soft-deleted) → no status page
  if (agent.status === "approved") redirect("/"); // approved → away (no dashboard yet)

  const rejected = agent.status === "rejected";
  // submittedAt is non-null on the self path (getAgentByUserId uses the full
  // AGENT_COLS mapper); the type is optional only for public-view agents (H2).
  const submitted = formatSubmitted(agent.submittedAt!, locale);

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
          {rejected ? t.applicationRejected : t.underReview}
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
          </>
        ) : (
          <>
            <h2>{t.underReview}</h2>
            <p className="auth-status-meta">{format(t.submitted, { date: submitted })}</p>
            <p>
              {format(t.underReviewBody, { date: submitted, email: agent.email ?? "" })}
            </p>
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
