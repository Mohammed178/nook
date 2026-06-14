import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import { signOutAction } from "@/app/account/actions";

export const metadata = {
  title: "Application status · Nook",
};

function formatSubmitted(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "long" }).format(d);
}

export default async function AgentPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // also enforced by middleware

  const agent = await getAgentByUserId(user.id);
  if (!agent) redirect("/"); // student / non-agent
  if (agent.deletedAt) redirect("/"); // F4, withdrawn/removed (soft-deleted) → no status page
  if (agent.status === "approved") redirect("/"); // approved → away (no dashboard yet)

  const rejected = agent.status === "rejected";
  // submittedAt is non-null on the self path (getAgentByUserId uses the full
  // AGENT_COLS mapper); the type is optional only for public-view agents (H2).
  const submitted = formatSubmitted(agent.submittedAt!);

  return (
    <div className="auth-shell auth-status-shell">
      <main className="auth-form auth-status">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} strokeWidth={1.7} />
          Back to nook.my
        </Link>

        <span className="auth-kicker">Agent application</span>
        <span
          className={`pill ${rejected ? "pill-rejected" : "pill-pending"} auth-status-pill`}
        >
          {rejected ? "Application rejected" : "Under review"}
        </span>

        {rejected ? (
          <>
            <h2>Application rejected</h2>
            <p className="auth-status-meta">Submitted {submitted}</p>
            <p>
              Your application was rejected.
              {agent.statusReason ? ` Reason: ${agent.statusReason}.` : ""}
            </p>
            <p>
              Email hello@getnook.com if you want to reapply. Reapplication is not
              open yet; this is the contact path for now.
            </p>
          </>
        ) : (
          <>
            <h2>Under review</h2>
            <p className="auth-status-meta">Submitted {submitted}</p>
            <p>
              Your application was submitted on {submitted}. We&apos;ll email{" "}
              {agent.email} when verification is complete.
            </p>
          </>
        )}

        <form action={signOutAction} className="auth-status-logout">
          <button type="submit" className="auth-status-logout-btn">
            Log out
          </button>
        </form>
      </main>
    </div>
  );
}
