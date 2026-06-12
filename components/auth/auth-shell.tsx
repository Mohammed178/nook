import Link from "next/link";
import { LogoMark } from "@/components/nook/logo";
import { Icon } from "@/components/nook/icon";

interface AuthShellProps {
  variant: "login" | "register";
  children: React.ReactNode;
}

export function AuthShell({ variant, children }: AuthShellProps) {
  const isLogin = variant === "login";

  return (
    <div className={`auth-shell ${isLogin ? "auth-shell-login" : "auth-shell-register"}`}>
      {isLogin ? (
        <aside className="auth-brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            <LogoMark variant="inverse" />
            <span>nook</span>
          </Link>
          <div>
            <div className="auth-testimonial">
              &ldquo;Found my room near UM in two days. The agent had her BOVAEP licence right
              on the listing — felt safe enough to put down a deposit.&rdquo;
              <cite>— Hidayah, Year 3 UM</cite>
            </div>
            <div className="auth-lede">
              <h1>Welcome back to&nbsp;Nook.</h1>
              <p>
                Verified student rentals across the Klang Valley. Saved searches, favourite
                listings, and direct lines to your agent — all in one place.
              </p>
            </div>
          </div>
          <div className="auth-footnote">
            © 2026 Nook Sdn Bhd · Registered with BOVAEP under E(3)1234
          </div>
        </aside>
      ) : null}

      <main className="auth-form">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} strokeWidth={1.7} />
          Back to nook.my
        </Link>
        {children}
      </main>

      {!isLogin ? (
        <aside className="auth-side">
          <div className="auth-side-card">
            <h4>What you get with Nook</h4>
            <ul className="auth-perks">
              <li>
                <Icon name="check" size={16} strokeWidth={1.7} />
                Every agent&apos;s BOVAEP licence shown on every listing — no fake-host scams.
              </li>
              <li>
                <Icon name="heart" size={16} strokeWidth={1.7} />
                Save up to 50 rooms across searches and compare side-by-side.
              </li>
              <li>
                <Icon name="whatsapp" size={16} />
                WhatsApp + call directly from the listing — no third-party messaging.
              </li>
              <li>
                <Icon name="calendar" size={16} strokeWidth={1.7} />
                Price-drop alerts on your shortlist + weekly digests for your campus.
              </li>
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
