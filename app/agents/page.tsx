import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { AgentsFilter } from "@/components/agents/agents-filter";
import { getAgentsWithCoverage } from "@/lib/data/agent-directory";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.agents };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface AgentsPageProps {
  searchParams: Promise<{ university?: string; area?: string }>;
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const [{ agents, areas }, dict, sp] = await Promise.all([
    getAgentsWithCoverage(),
    getDictionary(),
    searchParams,
  ]);
  const t = dict.agentsDirectory;
  const university = sp.university ?? "";
  const area = sp.area ?? "";

  // Facets only list campuses/areas an agent actually covers, so a filter never
  // resolves to zero by construction.
  const coveredUni = new Set(agents.flatMap((a) => a.universityIds));
  const universityOptions = UNIVERSITIES.filter((u) => coveredUni.has(u.id)).map(
    (u) => ({ value: u.id, label: u.name, meta: `${u.shortName} · ${u.city}` }),
  );
  const coveredArea = new Set(agents.flatMap((a) => a.areaSlugs));
  const areaOptions = areas
    .filter((a) => coveredArea.has(a.slug))
    .map((a) => ({ value: a.slug, label: a.name, meta: a.city }));

  const filtered = agents.filter(
    (a) =>
      (!university || a.universityIds.includes(university)) &&
      (!area || a.areaSlugs.includes(area)),
  );

  return (
    <>
      <Navbar active="agents" />

      <div className="container agents">
        <header className="agents-head">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1>
              {t.headline1}
              <br />
              {t.headline2}
            </h1>
          </div>
          <p className="dek">{t.dek}</p>
        </header>

        <div className="agents-toolbar">
          <AgentsFilter
            universities={universityOptions}
            areas={areaOptions}
            university={university}
            area={area}
          />
          <span className="agents-count">
            {format(filtered.length === 1 ? t.resultCountOne : t.resultCount, {
              count: filtered.length,
            })}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="agents-empty">
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyBody}</p>
            <Link href="/agents" className="btn btn-secondary">
              {t.clearFilters}
            </Link>
          </div>
        ) : (
          <ul className="agents-grid">
            {filtered.map(({ agent, activeListings, areaNames }, i) => (
              <li
                key={agent.id}
                className="agents-cell"
                style={{ "--i": i } as React.CSSProperties}
              >
                <Link href={`/agents/${agent.slug}`} className="agents-card">
                  {agent.avatarUrl ? (
                    <div
                      className="agents-av"
                      style={{ backgroundImage: `url(${agent.avatarUrl})` }}
                      aria-hidden
                    />
                  ) : (
                    <div className="agents-av agents-av-initials">
                      {initials(agent.name)}
                    </div>
                  )}
                  <div className="agents-card-body">
                    <div className="agents-name">
                      {agent.name}
                      {agent.status === "approved" && (
                        <Icon
                          name="check-circle"
                          size={14}
                          className="agents-verif"
                        />
                      )}
                    </div>
                    <div className="agents-agency">
                      {agent.agency ?? t.independent}
                    </div>
                    <div className="agents-meta">
                      <span className="agents-rating">
                        <Icon name="star" size={12} />
                        <strong>{agent.rating.toFixed(1)}</strong> ·{" "}
                        {agent.reviewCount} {t.reviews}
                      </span>
                      <span className="agents-dot">·</span>
                      <span>
                        <strong>{activeListings}</strong> {t.active}
                      </span>
                    </div>
                    {areaNames.length > 0 && (
                      <div className="agents-areas">
                        {areaNames.slice(0, 3).join(" · ")}
                      </div>
                    )}
                  </div>
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="agents-go rtl-flip"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
