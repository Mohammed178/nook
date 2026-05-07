import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="logo" style={{ color: "#fff", marginBottom: 12 }}>
              <span className="logo-mark">N</span>
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
              <li><Link href="/list-property">List a property</Link></li>
              <li><Link href="/verification">Verification</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/agent-login">Agent login</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/press">Press</Link></li>
              <li><Link href="/careers">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/bovaep">BOVAEP</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
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
