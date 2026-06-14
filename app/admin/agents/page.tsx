import { Icon } from "@/components/nook/icon";
import { listPendingAgents } from "./_data";
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
        <span className="account-page-kicker">Trust &amp; safety</span>
        <h1>Pending agents</h1>
        <p className="account-page-sub">
          {agents.length === 0
            ? "No applications waiting."
            : `${agents.length} ${agents.length === 1 ? "application" : "applications"} awaiting review.`}
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon" aria-hidden="true">
            <Icon name="check" size={28} />
          </span>
          <h2>Queue clear</h2>
          <p>
            No agent applications waiting. New submissions land here for review.
          </p>
        </div>
      ) : (
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
                  <td>{agent.agency ?? "-"}</td>
                  <td className="tabular">{agent.bovaepLicence ?? "-"}</td>
                  <td>{agent.email ?? "-"}</td>
                  <td>{formatSubmitted(agent.submittedAt!)}</td>
                  <td>
                    <span className="pill pill-pending">Pending</span>
                  </td>
                  <td className="admin-queue-actions">
                    <form action={approveAgentAction}>
                      <input type="hidden" name="agentId" value={agent.id} />
                      <button type="submit" className="btn btn-sm btn-approve">
                        Approve
                      </button>
                    </form>
                    <form action={rejectAgentAction} className="admin-reject-form">
                      <input type="hidden" name="agentId" value={agent.id} />
                      <input
                        type="text"
                        name="reason"
                        required
                        maxLength={500}
                        placeholder="Reason"
                        aria-label="Rejection reason"
                        className="admin-reject-reason"
                      />
                      <button type="submit" className="btn btn-sm btn-reject">
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
