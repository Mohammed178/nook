import Link from "next/link";
import { CountUp } from "@/components/motion/count-up";
import { Magnetic } from "@/components/motion/magnetic";
import { BIG_CTA_IMAGE_URL, BIG_CTA_STATS } from "@/lib/home-content";

// Closing band: asymmetric split echoing the hero, solid slate content panel
// on the left, KL-at-night photograph on the right with the stats floating
// over it as glass chips (the hero deck's floating-card motif, reprised).
export function BigCTA() {
  return (
    <section className="home-container">
      <div className="big-cta">
        <div className="big-cta-content">
          <div className="big-cta-kicker">For agents</div>
          <h2>
            Got rooms to rent?
            <br />
            List them on Nook.
          </h2>
          <p>
            Reach 40,000+ students looking for a room this month. Verified
            agents see 3.4× more enquiries. Free for your first 3 listings,
            no commission, ever.
          </p>
          <div className="ctas">
            <Magnetic>
              <Link href="/agents/register" className="btn-on-brand">
                List a property →
              </Link>
            </Magnetic>
            <Link href="/agents/register" className="btn-on-brand-ghost">
              How verification works
            </Link>
          </div>
        </div>
        <div
          className="big-cta-media"
          role="img"
          aria-label="Kuala Lumpur skyline at night"
          style={{ ["--big-cta-bg" as string]: `url('${BIG_CTA_IMAGE_URL}')` }}
        >
          <a
            className="big-cta-credit"
            href="https://commons.wikimedia.org/wiki/File:Kl-skyline-at-night-2022.jpg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Photo: Wikimedia Commons
          </a>
          <dl className="big-cta-stats">
            {BIG_CTA_STATS.map((s, i) => (
              <div
                key={s.label}
                className="bcs-chip"
                style={{ "--i": i } as React.CSSProperties}
              >
                <dd>
                  <CountUp value={s.value} />
                </dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
