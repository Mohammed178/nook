import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/nook/icon";
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
      icon: "shield" as const,
      value: counts.pendingAgents,
      label: o.pending,
      href: "/admin/agents",
    },
    {
      icon: "school" as const,
      value: counts.liveUniversities,
      label: o.liveUniversities,
      href: "/admin/universities",
    },
    {
      icon: "eye-off" as const,
      value: counts.hiddenUniversities,
      label: o.hiddenUniversities,
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
                <Icon name={s.icon} size={15} className="ico" aria-hidden="true" />
                {s.label}
              </span>
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
