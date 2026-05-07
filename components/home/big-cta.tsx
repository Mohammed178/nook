import Link from "next/link";
import { BIG_CTA_STATS } from "@/lib/home-content";

export function BigCTA() {
  return (
    <section className="home-container">
      <div className="big-cta">
        <div>
          <h2>Got rooms to rent? List on Nook.</h2>
          <p>
            Reach 40,000+ students looking for a room this month. Verified agents see 3.4× more enquiries.
            Free for your first 3 listings — no commission, ever.
          </p>
          <div className="ctas">
            <Link href="/list-property" className="btn-on-brand">List a property →</Link>
            <Link href="/list-property#pricing" className="btn-on-brand-ghost">See pricing</Link>
          </div>
        </div>
        <div className="big-cta-stats">
          {BIG_CTA_STATS.map((s) => (
            <div key={s.label} className="bcs-row">
              <span className="v">{s.value}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
