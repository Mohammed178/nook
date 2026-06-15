import Link from "next/link";
import { LogoMark } from "@/components/nook/logo";
import { Icon } from "@/components/nook/icon";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface AuthShellProps {
  variant: "login" | "register";
  dict: Dictionary;
  children: React.ReactNode;
}

export function AuthShell({ variant, dict, children }: AuthShellProps) {
  const isLogin = variant === "login";
  const t = dict.auth;

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
              {t.testimonial}
              <cite>{t.testimonialCite}</cite>
            </div>
            <div className="auth-lede">
              <h1>{t.welcomeBackHeading}</h1>
              <p>{t.brandLede}</p>
            </div>
          </div>
          <div className="auth-footnote">{t.footnote}</div>
        </aside>
      ) : null}

      <main className="auth-form">
        <Link href="/" className="auth-back">
          <Icon name="arrow-left" size={14} strokeWidth={1.7} className="rtl-flip" />
          {t.backToHome}
        </Link>
        {children}
      </main>

      {!isLogin ? (
        <aside className="auth-side">
          <div className="auth-side-card">
            <h4>{t.perksTitle}</h4>
            <ul className="auth-perks">
              <li>
                <Icon name="check" size={16} strokeWidth={1.7} />
                {t.perkLicence}
              </li>
              <li>
                <Icon name="heart" size={16} strokeWidth={1.7} />
                {t.perkSave}
              </li>
              <li>
                <Icon name="whatsapp" size={16} />
                {t.perkWhatsapp}
              </li>
              <li>
                <Icon name="calendar" size={16} strokeWidth={1.7} />
                {t.perkAlerts}
              </li>
            </ul>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
