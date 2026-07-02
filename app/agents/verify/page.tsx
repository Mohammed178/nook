import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import {
  getAgentDocumentsForCurrentUser,
  getAgentConsentsForCurrentUser,
  VERIFIED_AGENT_TERMS_VERSION,
} from "@/lib/data/agent-verification";
import { getDictionary } from "@/lib/i18n/server";
import { VerifyStepper } from "@/components/agents/verify-stepper";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.verifyAgent };
}

// Gate: signed in + has agents row + pending + not soft-deleted. Approved
// agents go to the dashboard; rejected agents go back to /agents/pending
// (which shows the rejected copy). Students fall through to /.
//
// Why a dedicated route: the dashboard layout (app/agents/dashboard/layout.tsx)
// already gates approved-only, so verification cannot live under /dashboard;
// pending agents would be redirected away. /agents/pending is the natural
// landing page but it is read-only "status" — the stepped flow needs its own
// route so a reload during step 3 doesn't reset the form.
export default async function AgentVerifyPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!user) redirect("/login");

  const agent = await getAgentByUserId(user.id);
  if (!agent) redirect("/");
  if (agent.deletedAt) redirect("/agents/pending");
  if (agent.status === "approved") redirect("/agents/dashboard");
  if (agent.status === "rejected") redirect("/agents/pending");

  // Read once on the server; the client stepper takes initial state and
  // optimistically updates as each step succeeds (revalidatePath repopulates
  // on next navigation).
  const [documents, consents] = await Promise.all([
    getAgentDocumentsForCurrentUser(),
    getAgentConsentsForCurrentUser(),
  ]);
  const acceptedTerms = consents.some(
    (c) => c.consentType === "verified_agent_terms",
  );

  const t = dict.agentVerify;

  return (
    <div className="container verify-container">
      <Link href="/agents/pending" className="auth-back">
        <Icon name="arrow-left" size={14} strokeWidth={1.7} className="rtl-flip" />
        {t.backToStatus}
      </Link>

      <header className="verify-head">
        <span className="auth-kicker">{t.kicker}</span>
        <h1>{t.title}</h1>
        <p className="verify-sub">{t.sub}</p>
      </header>

      <VerifyStepper
        dict={dict}
        agent={{
          id: agent.id,
          name: agent.name,
          phone: agent.phone ?? "",
          agency: agent.agency ?? "",
          bovaepLicence: agent.bovaepLicence ?? "",
          licenceType: agent.licenceType ?? null,
          practisingState: agent.practisingState ?? null,
          phoneVerified: agent.phoneVerified ?? false,
          verificationSubmittedAt: agent.verificationSubmittedAt ?? null,
        }}
        initialDocuments={documents}
        acceptedTerms={acceptedTerms}
        termsVersion={VERIFIED_AGENT_TERMS_VERSION}
      />
    </div>
  );
}
