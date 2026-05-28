import { listPendingAgents } from "@/lib/data/agents";
import { approveAgentAction, rejectAgentAction } from "./actions";

export const metadata = {
  title: "Pending agents · Nook",
};

function formatSubmitted(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(d);
}

export default async function AdminAgentsPage() {
  const agents = await listPendingAgents();

  return (
    <div>
      <div className="account-page-head">
        <h1>Pending agents</h1>
        <p className="account-page-sub">
          {agents.length === 0
            ? "No applications waiting."
            : `${agents.length} ${agents.length === 1 ? "application" : "applications"} awaiting review.`}
        </p>
      </div>

      {agents.length > 0 && (
        <div className="admin-queue-wrap">
          <table className="admin-queue-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Agency</th>
                <th>BOVAEP licence</th>
                <th>Email</th>
                <th>Registered</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.agency ?? "—"}</td>
                  <td className="tabular">{agent.bovaepLicence ?? "—"}</td>
                  <td>{agent.email ?? "—"}</td>
                  <td>{formatSubmitted(agent.submittedAt)}</td>
                  <td>
                    <span className="pill pill-pending">Pending</span>
                  </td>
                  <td className="admin-queue-actions">
                    <form action={approveAgentAction}>
                      <input type="hidden" name="agentId" value={agent.id} />
                      <button type="submit" className="btn btn-sm btn-primary">
                        Approve
                      </button>
                    </form>
                    <form action={rejectAgentAction}>
                      <input type="hidden" name="agentId" value={agent.id} />
                      <button type="submit" className="btn btn-sm btn-ghost">
                        Reject
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
