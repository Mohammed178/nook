import type { Metadata } from "next";
import { Icon } from "@/components/nook/icon";
import {
  listPendingAgents,
  listAgentDocumentsForAdmin,
  listAgentConsentCounts,
} from "./_data";
import { approveAgentAction } from "./actions";
import { AgentDocLinks } from "@/components/admin/agent-doc-links";
import { RejectAgentDialog } from "@/components/admin/reject-agent-dialog";
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
  const agentIds = agents.map((a) => a.id);
  const [docsByAgent, consentCounts] = await Promise.all([
    listAgentDocumentsForAdmin(agentIds),
    listAgentConsentCounts(agentIds),
  ]);
  const t = dict.admin;
  const v = dict.agentVerify;

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
          <table className="admin-queue-table admin-queue-table-wide">
            <thead>
              <tr>
                <th>{t.colName}</th>
                <th>{t.colAgency}</th>
                <th>{t.colLicenceType}</th>
                <th>{t.colLicence}</th>
                <th>{t.colState}</th>
                <th>{t.colEmail}</th>
                <th>{t.colRegistered}</th>
                <th>{t.colCompleteness}</th>
                <th>{t.colDocuments}</th>
                <th>{t.colStatus}</th>
                <th aria-label={t.colActions} />
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const docs = docsByAgent.get(agent.id) ?? [];
                const docsOk = docs.length >= 1;
                const phoneOk = agent.phoneVerified === true;
                const termsOk = (consentCounts.get(agent.id) ?? 0) >= 1;
                const reviewReady = !!agent.verificationSubmittedAt;
                return (
                  <tr key={agent.id} className={reviewReady ? "admin-queue-row-ready" : ""}>
                    <td>{agent.name}</td>
                    <td>{agent.agency ?? "-"}</td>
                    <td>{agent.licenceType ?? "-"}</td>
                    <td className="tabular">{agent.bovaepLicence ?? "-"}</td>
                    <td>{agent.practisingState ?? "-"}</td>
                    <td>{agent.email ?? "-"}</td>
                    <td>{formatSubmitted(agent.submittedAt!, locale)}</td>
                    <td>
                      <ul className="admin-chip-list" aria-label={v.progressAria}>
                        <li>
                          <span className={`verify-chip verify-chip-${docsOk ? "ok" : "missing"}`}>
                            <Icon name={docsOk ? "check" : "x"} size={12} aria-hidden />
                            <span>{v.chipDocs}</span>
                          </span>
                        </li>
                        <li>
                          <span className={`verify-chip verify-chip-${phoneOk ? "ok" : "missing"}`}>
                            <Icon name={phoneOk ? "check" : "x"} size={12} aria-hidden />
                            <span>{v.chipPhone}</span>
                          </span>
                        </li>
                        <li>
                          <span className={`verify-chip verify-chip-${termsOk ? "ok" : "missing"}`}>
                            <Icon name={termsOk ? "check" : "x"} size={12} aria-hidden />
                            <span>{v.chipTerms}</span>
                          </span>
                        </li>
                      </ul>
                    </td>
                    <td>
                      <AgentDocLinks
                        docs={docs.map((d) => ({
                          id: d.id,
                          docType: d.docType,
                          storagePath: d.storagePath,
                        }))}
                        labelRen={v.docTypeRen}
                        labelEmployment={v.docTypeEmployment}
                        ctaView={t.viewDocument}
                        ctaOpening={t.opening}
                        ctaFailed={t.docLinkFailed}
                        emptyLabel={t.noDocuments}
                      />
                    </td>
                    <td>
                      {reviewReady ? (
                        <span className="pill pill-pending">{t.reviewReady}</span>
                      ) : (
                        <span className="pill pill-pending">{t.pending}</span>
                      )}
                    </td>
                    <td className="admin-queue-actions">
                      <form action={approveAgentAction}>
                        <input type="hidden" name="agentId" value={agent.id} />
                        <button type="submit" className="btn btn-sm btn-approve">
                          {t.approve}
                        </button>
                      </form>
                      <RejectAgentDialog
                        agentId={agent.id}
                        agentName={agent.name}
                        agency={agent.agency ?? null}
                        dict={dict}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
