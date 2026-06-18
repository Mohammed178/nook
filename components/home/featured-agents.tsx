import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { getFeaturedAgents } from "@/lib/data/featured";
import { getDictionary } from "@/lib/i18n/server";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export async function FeaturedAgents() {
  const agents = await getFeaturedAgents();
  if (agents.length === 0) return null;
  const h = (await getDictionary()).home;

  return (
    <section className="home-container tight">
      <div className="home-sec-head">
        <div>
          <h2>{h.agentsTitle}</h2>
          <div className="sub">{h.agentsSub}</div>
        </div>
        <Link href="/agents" className="more">{h.allAgents}</Link>
      </div>
      <div className="agent-grid">
        {agents.map(({ agent, activeListings, areasServed }) => (
          <Link key={agent.id} href={`/agents/${agent.slug}`} className="agent-card">
            {agent.avatarUrl ? (
              <div
                className="av"
                style={{ backgroundImage: `url(${agent.avatarUrl})` }}
                aria-hidden
              />
            ) : (
              <div className="av av-initials">{initials(agent.name)}</div>
            )}
            <div style={{ flex: 1 }}>
              <div className="agent-name">
                {agent.name}
                {agent.status === "approved" && (
                  <Icon name="check" size={14} strokeWidth={2} style={{ color: "var(--success)" }} />
                )}
              </div>
              <div className="agency">{agent.agency ?? h.independent}</div>
              <div className="meta-row">
                <span><strong>{activeListings}</strong> {h.active}</span>
              </div>
              {areasServed && <div className="areas">{areasServed}</div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
