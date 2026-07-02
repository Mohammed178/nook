import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AgentRegisterForm } from "@/components/auth/agent-register-form";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.registerAgency };
}

export default async function AgentRegisterPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);

  // Signed-in visitors: an existing agent goes to their status surface; a user
  // WITHOUT an agents row gets the orphan-recovery variant (login exists, agents
  // INSERT never happened — pre-0034 duplicate-licence registrations). They
  // complete the profile here instead of being bounced to / with no way back.
  let mode: "full" | "complete" = "full";
  if (user) {
    const agent = await getAgentByUserId(user.id);
    if (agent && !agent.deletedAt) {
      redirect(agent.status === "approved" ? "/agents/dashboard" : "/agents/pending");
    }
    if (agent) redirect("/"); // soft-deleted (withdrawn): no re-registration path
    mode = "complete";
  }

  return (
    <AuthShell variant="register" dict={dict}>
      <AgentRegisterForm dict={dict} mode={mode} />
    </AuthShell>
  );
}
