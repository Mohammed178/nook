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
  if (agent.status === "approved") redirect("/"); // approved → away (no dashboard yet)

  const rejected = agent.status === "rejected";
  const submitted = formatSubmitted(agent.submittedAt);

  return (
    <div className="auth-shell auth-shell-login">
      <main className="auth-form">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} strokeWidth={1.7} />
          Back to nook.my
        </Link>

        <div className="agent-status-head">
          <span className={`pill ${rejected ? "pill-rejected" : "pill-pending"}`}>
            {rejected ? "Application rejected" : "Under review"}
          </span>
          <div className="auth-sub" style={{ marginTop: 8 }}>
            Submitted {submitted}
          </div>
        </div>

        {rejected ? (
          <>
            <h2>Application rejected</h2>
            <p>
              Your application was rejected. Reason: {agent.statusReason}.
            </p>
            <p>
              Email hello@getnook.com if you want to reapply. Reapplication is not
              open yet; this is the contact path for now.
            </p>
          </>
        ) : (
          <>
            <h2>Under review</h2>
            <p>
              Your application was submitted on {submitted}. We&apos;ll email{" "}
              {agent.email} when verification is complete.
            </p>
          </>
        )}

        <form action={signOutAction} style={{ marginTop: 24 }}>
          <button type="submit" className="auth-bottom-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            Log out
          </button>
        </form>
      </main>
    </div>
  );
}
