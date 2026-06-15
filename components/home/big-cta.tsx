import Link from "next/link";
import { CountUp } from "@/components/motion/count-up";
import { Magnetic } from "@/components/motion/magnetic";
import { BIG_CTA_IMAGE_URL, BIG_CTA_STATS } from "@/lib/home-content";
import { getDictionary } from "@/lib/i18n/server";

// Closing band: asymmetric split echoing the hero, solid slate content panel
// on the left, KL-at-night photograph on the right with the stats floating
// over it as glass chips (the hero deck's floating-card motif, reprised).
export async function BigCTA() {
  const h = (await getDictionary()).home;
  return (
    <section className="home-container">
      <div className="big-cta">
        <div className="big-cta-content">
          <div className="big-cta-kicker">{h.bigCtaKicker}</div>
          <h2>
            {h.bigCtaHeadline1}
            <br />
            {h.bigCtaHeadline2}
          </h2>
          <p>{h.bigCtaBody}</p>
          <div className="ctas">
            <Magnetic>
              <Link href="/agents/register" className="btn-on-brand">
                {h.listProperty}
              </Link>
            </Magnetic>
            <Link href="/agents/register" className="btn-on-brand-ghost">
              {h.howVerification}
            </Link>
          </div>
        </div>
        <div
          className="big-cta-media"
          role="img"
          aria-label={h.klSkylineAlt}
          style={{ ["--big-cta-bg" as string]: `url('${BIG_CTA_IMAGE_URL}')` }}
        >
          <a
            className="big-cta-credit"
            href="https://commons.wikimedia.org/wiki/File:Kl-skyline-at-night-2022.jpg"
            target="_blank"
            rel="noopener noreferrer"
          >
            {h.photoCredit}
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
                <dt>{h.bigCtaStatLabels[i] ?? s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
