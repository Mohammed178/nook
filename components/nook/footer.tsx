import Link from "next/link";
import { LogoMark } from "@/components/nook/logo";
import { Icon, type IconName } from "@/components/nook/icon";

// Folded in from the old homepage trust strip — same claims, one line each.
const TRUST_ITEMS: { iconName: IconName; label: string }[] = [
  { iconName: "check", label: "REN/PEA licences checked against BOVAEP" },
  { iconName: "camera", label: "Min. 5 real photos per listing" },
  { iconName: "star", label: "Reviews only from completed tenancies" },
  { iconName: "shield", label: "Reports reviewed within 48 hours" },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-trust">
          {TRUST_ITEMS.map((it) => (
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
              Verified student rentals across the Klang Valley. Operated by BOVAEP-licensed
              agents.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: "var(--ink-700)", color: "#fff" }}
              >
                EN
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: "transparent",
                  color: "var(--ink-300)",
                  border: "1px solid var(--ink-700)",
                }}
              >
                BM
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: "transparent",
                  color: "var(--ink-300)",
                  border: "1px solid var(--ink-700)",
                }}
              >
                عربي
              </button>
            </div>
          </div>
          <div>
            <h4>For students</h4>
            <ul>
              <li><Link href="/listings">Browse rooms</Link></li>
              <li><Link href="/areas">Areas</Link></li>
              <li><Link href="/universities">Universities</Link></li>
              <li><Link href="/saved">Saved</Link></li>
            </ul>
          </div>
          <div>
            <h4>For agents</h4>
            <ul>
              <li><Link href="/agents/register">List a property</Link></li>
              <li><Link href="/verification">Verification</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/agent-login">Agent login</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company &amp; legal</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/bovaep">BOVAEP</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Nook Sdn Bhd · Registered with BOVAEP under E(3)1234</span>
          <span>Klang Valley · Selangor + KL</span>
        </div>
      </div>
    </footer>
  );
}
