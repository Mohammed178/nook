import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { Icon, type IconName } from "@/components/nook/icon";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

// Support is email-only for now (decided 2026-06-18). The address lives here as
// the single source; swap it when the real mailbox is live. No backend, no form:
// this page is static chrome over the localized FAQ in the dictionary.
const SUPPORT_EMAIL = "help@nook.my";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.help };
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export default async function HelpPage() {
  const dict = await getDictionary();
  const t = dict.help;
  const mailto = `mailto:${SUPPORT_EMAIL}`;

  // Pulled from nav labels so they stay in sync with the rest of the site.
  const related = [
    { href: "/essentials", label: dict.nav.essentials },
    { href: "/areas", label: dict.nav.areas },
    { href: "/universities", label: dict.nav.universities },
    { href: "/listings", label: dict.nav.findRoom },
  ];

  return (
    <>
      <Navbar active="help" />

      <div className="container help-page">
        <header className="help-head">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1>
              {t.headline1}
              <br />
              {t.headline2}
            </h1>
          </div>
          <p className="dek">{format(t.dek, { groups: t.groups.length })}</p>
        </header>

        {/* Jump nav, anchors only, no JavaScript. */}
        <nav className="help-jump" aria-label={t.jumpAria}>
          {t.groups.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="help-jump-link">
              <Icon name={g.icon as IconName} size={14} />
              {g.title}
            </a>
          ))}
          <a href="#contact" className="help-jump-link">
            <Icon name="mail" size={14} />
            {t.contactTitle}
          </a>
        </nav>

        {t.groups.map((g, i) => (
          <section
            key={g.id}
            id={g.id}
            className="help-cat"
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="help-cat-head">
              <span className="help-cat-num" aria-hidden="true">
                {num(i)}
              </span>
              <div className="help-cat-intro">
                <h2>
                  <span className="help-cat-ico" aria-hidden="true">
                    <Icon name={g.icon as IconName} size={18} />
                  </span>
                  {g.title}
                </h2>
                <p>{g.blurb}</p>
              </div>
            </div>

            {/* Native disclosure widgets: keyboard-accessible, zero JS. */}
            <ul className="help-faqs" aria-label={t.faqAria}>
              {g.faqs.map((f, j) => (
                <li key={j} className="help-faq">
                  <details>
                    <summary>
                      <span className="help-q">{f.q}</span>
                      <Icon
                        name="chevron-down"
                        size={18}
                        className="help-chev"
                      />
                    </summary>
                    <p className="help-a">{f.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section
          id="contact"
          className="help-contact"
          style={{ "--i": t.groups.length } as React.CSSProperties}
        >
          <div className="help-contact-text">
            <div className="kicker">{t.contactKicker}</div>
            <h2>{t.contactTitle}</h2>
            <p>{t.contactBlurb}</p>
            <p className="help-contact-note">{t.emailNote}</p>
          </div>
          <a
            className="help-contact-card"
            href={mailto}
            aria-label={format(t.opensEmail, { email: SUPPORT_EMAIL })}
          >
            <span className="help-contact-ico" aria-hidden="true">
              <Icon name="mail" size={20} />
            </span>
            <span className="help-contact-meta">
              <span className="help-contact-label">{t.emailLabel}</span>
              <span className="help-contact-value">{SUPPORT_EMAIL}</span>
            </span>
            <span className="help-contact-cta">
              {t.emailCta}
              <Icon name="arrow-right" size={14} className="rtl-flip" />
            </span>
          </a>
        </section>

        <nav className="help-related" aria-label={t.relatedTitle}>
          <span className="help-related-title">{t.relatedTitle}</span>
          <div className="help-related-links">
            {related.map((r) => (
              <Link key={r.href} href={r.href} className="help-related-link">
                {r.label}
                <Icon name="arrow-right" size={13} className="rtl-flip" />
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
