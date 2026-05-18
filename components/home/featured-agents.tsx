import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { getFeaturedAgents } from "@/lib/data/featured";

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

  return (
    <section className="home-container tight">
      <div className="home-sec-head">
        <div>
          <h2>Top agents this month</h2>
          <div className="sub">Most responsive, highest-rated agents in the Klang Valley.</div>
        </div>
        <Link href="/agents" className="more">All agents →</Link>
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
                {agent.verified && (
                  <Icon name="check" size={14} strokeWidth={2} style={{ color: "var(--success)" }} />
                )}
              </div>
              <div className="agency">{agent.agency ?? "Independent"}</div>
              <div className="meta-row">
                <span>
                  <span className="star">★</span> <strong>{agent.rating.toFixed(1)}</strong> · {agent.reviewCount} reviews
                </span>
                <span style={{ color: "var(--ink-300)" }}>·</span>
                <span><strong>{activeListings}</strong> active</span>
              </div>
              {areasServed && <div className="areas">{areasServed}</div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
