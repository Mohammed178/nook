import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOverviewCounts } from "./_data";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.admin };
}

// Admin landing (H2). Was a redirect to the queue; now a glance dashboard so an
// admin sees the pending-request load and university visibility split in one
// place. Mirrors app/account/page.tsx's overview language (acct/dash stat grid).
export default async function AdminPage() {
  const [counts, dict] = await Promise.all([
    getAdminOverviewCounts(),
    getDictionary(),
  ]);
  const o = dict.admin.overview;

  const stats = [
    {
      tone: "pending" as const,
      value: counts.pendingAgents,
      label: o.pending,
      hint: o.pendingHint,
      href: "/admin/agents",
    },
    {
      tone: "live" as const,
      value: counts.approvedAgents,
      label: o.approved,
      hint: o.approvedHint,
      href: "/admin/agents",
    },
    {
      tone: "available" as const,
      value: counts.liveUniversities,
      label: o.liveUniversities,
      hint: o.liveUniversitiesHint,
      href: "/admin/universities",
    },
    {
      tone: "archived" as const,
      value: counts.hiddenUniversities,
      label: o.hiddenUniversities,
      hint: o.hiddenUniversitiesHint,
      href: "/admin/universities",
    },
  ];

  return (
    <div>
      <div className="account-page-head">
        <span className="account-page-kicker">{o.kicker}</span>
        <h1>{o.title}</h1>
      </div>

      <ul className="dash-stats" aria-label={o.aria}>
        {stats.map((s, i) => (
          <li
            key={s.label}
            className="dash-stat"
            style={{ "--i": i } as React.CSSProperties}
          >
            <Link href={s.href} className="dash-stat-link">
              <span className="dash-stat-num">{s.value}</span>
              <span className="dash-stat-label">
                <span
                  className={`dash-stat-dot dot-${s.tone}`}
                  aria-hidden="true"
                />
                {s.label}
              </span>
              <span className="dash-stat-hint">{s.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="admin-uni-toolbar">
        <Link href="/admin/agents" className="btn btn-primary btn-sm">
          {o.reviewQueue}
        </Link>
        <Link href="/admin/universities" className="btn btn-secondary btn-sm">
          {o.manageUniversities}
        </Link>
      </section>
    </div>
  );
}
