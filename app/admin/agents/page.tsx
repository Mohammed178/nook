import type { Metadata } from "next";
import { Icon } from "@/components/nook/icon";
import { listPendingAgents } from "./_data";
import { approveAgentAction, rejectAgentAction } from "./actions";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format, LOCALE_DATE_TAG, type Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.pendingAgents };
}

function formatSubmitted(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "medium",
  }).format(d);
}

export default async function AdminAgentsPage() {
  const [agents, dict, locale] = await Promise.all([
    listPendingAgents(),
    getDictionary(),
    getLocale(),
  ]);
  const t = dict.admin;

  return (
    <div>
      <div className="account-page-head">
        <span className="account-page-kicker">{t.trustSafety}</span>
        <h1>{t.pendingAgents}</h1>
        <p className="account-page-sub">
          {agents.length === 0
            ? t.noApplications
            : format(
                agents.length === 1
                  ? t.applicationAwaiting
                  : t.applicationsAwaiting,
                { count: agents.length },
              )}
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon" aria-hidden="true">
            <Icon name="check" size={28} />
          </span>
          <h2>{t.queueClear}</h2>
          <p>{t.queueClearBody}</p>
        </div>
      ) : (
        <div className="admin-queue-wrap">
          <table className="admin-queue-table">
            <thead>
              <tr>
                <th>{t.colName}</th>
                <th>{t.colAgency}</th>
                <th>{t.colLicence}</th>
                <th>{t.colEmail}</th>
                <th>{t.colRegistered}</th>
                <th>{t.colStatus}</th>
                <th aria-label={t.colActions} />
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.agency ?? "-"}</td>
                  <td className="tabular">{agent.bovaepLicence ?? "-"}</td>
                  <td>{agent.email ?? "-"}</td>
                  <td>{formatSubmitted(agent.submittedAt!, locale)}</td>
                  <td>
                    <span className="pill pill-pending">{t.pending}</span>
                  </td>
                  <td className="admin-queue-actions">
                    <form action={approveAgentAction}>
                      <input type="hidden" name="agentId" value={agent.id} />
                      <button type="submit" className="btn btn-sm btn-approve">
                        {t.approve}
                      </button>
                    </form>
                    <form action={rejectAgentAction} className="admin-reject-form">
                      <input type="hidden" name="agentId" value={agent.id} />
                      <input
                        type="text"
                        name="reason"
                        required
                        maxLength={500}
                        placeholder={t.reasonPlaceholder}
                        aria-label={t.rejectionReason}
                        className="admin-reject-reason"
                      />
                      <button type="submit" className="btn btn-sm btn-reject">
                        {t.reject}
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
