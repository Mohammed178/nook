import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

// Post-deletion confirmation. Deliberately OUTSIDE /account/** — the caller is
// signed out by the time they land here, and the middleware would bounce them
// to /login from any account route. Public, noindex, no data reads.
export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.goodbye, robots: { index: false } };
}

export default async function GoodbyePage() {
  const dict = await getDictionary();
  const a = dict.account;

  return (
    <div className="auth-shell auth-status-shell">
      <main className="auth-form auth-status">
        <h1>{a.goodbyeTitle}</h1>
        <p className="auth-status-meta">{a.goodbyeBody}</p>
        <div className="verify-cta-row">
          <Link href="/" className="btn btn-primary verify-cta">
            {a.goodbyeHome}
          </Link>
        </div>
      </main>
    </div>
  );
}
