import { redirect } from "next/navigation";
import { Navbar } from "@/components/nook/navbar";
import { DashboardSidebar } from "@/components/agents/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";

export const metadata = {
  title: "Dashboard · Nook",
};

// Phase 4b dashboard gate (L-4b.15, Q16). The agent is resolved ONCE here — the
// single status-aware gate for every /agents/dashboard/* route. Middleware
// (layer 1) only enforces signed-in → /login; the approved-only decision lives
// here because it needs a DB read (the agent's status), which middleware avoids
// per-request.
//
//   no session        → /login   (middleware already does this; belt-and-braces)
//   no agents row      → /        (student / non-agent)
//   pending | rejected → /agents/pending
//   approved           → render the dashboard
//
// Child pages re-resolve the agent's own listings via current_agent_id() (RLS),
// so they do not depend on a prop from here — this layout is purely the gate +
// chrome, matching app/admin/layout.tsx.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const agent = await getAgentByUserId(user.id);
  if (!agent) redirect("/");
  if (agent.status !== "approved") redirect("/agents/pending");

  return (
    <>
      <Navbar />
      <div className="container account-shell">
        <DashboardSidebar displayName={user.displayName} email={user.email} />
        <main className="account-content">{children}</main>
      </div>
    </>
  );
}
