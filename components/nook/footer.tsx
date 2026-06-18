import Link from "next/link";
import { LogoMark } from "@/components/nook/logo";
import { Icon, type IconName } from "@/components/nook/icon";
import { LanguageSwitcher } from "@/components/nook/language-switcher";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export function Footer({ dict }: { dict: Dictionary }) {
  const f = dict.footer;

  // Folded in from the old homepage trust strip, same claims, one line each.
  const trustItems: { iconName: IconName; label: string }[] = [
    { iconName: "check", label: f.trustLicences },
    { iconName: "camera", label: f.trustPhotos },
    { iconName: "shield", label: f.trustReports },
  ];

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-trust">
          {trustItems.map((it) => (
            <span key={it.label} className="footer-trust-item">
              <Icon name={it.iconName} size={14} strokeWidth={1.8} />
              {it.label}
            </span>
          ))}
        </div>
        <div className="footer-grid">
          <div>
            <div className="logo" style={{ color: "#fff", marginBottom: 12 }}>
              <LogoMark variant="inverse" />
              <span style={{ color: "#fff" }}>nook</span>
            </div>
            <p
              style={{
                color: "var(--ink-400)",
                fontSize: "var(--t-sm)",
                maxWidth: 280,
                marginBottom: 16,
              }}
            >
              {f.tagline}
            </p>
            <LanguageSwitcher variant="inline" />
          </div>
          <div>
            <h4>{f.forStudents}</h4>
            <ul>
              <li><Link href="/listings">{f.browseRooms}</Link></li>
              <li><Link href="/areas">{f.areas}</Link></li>
              <li><Link href="/universities">{f.universities}</Link></li>
              <li><Link href="/agents">{f.agents}</Link></li>
              <li><Link href="/account/saved">{f.saved}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{f.forAgents}</h4>
            <ul>
              <li><Link href="/agents/register">{f.listProperty}</Link></li>
              <li><Link href="/verification">{f.verification}</Link></li>
              <li><Link href="/pricing">{f.pricing}</Link></li>
              <li><Link href="/login">{f.agentLogin}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{f.companyLegal}</h4>
            <ul>
              <li><Link href="/help">{f.help}</Link></li>
              <li><Link href="/about">{f.about}</Link></li>
              <li><Link href="/terms">{f.terms}</Link></li>
              <li><Link href="/privacy">{f.privacy}</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{f.copyright}</span>
          <span>{f.region}</span>
        </div>
      </div>
    </footer>
  );
}
