import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { auth } = await getDictionary();
  return { title: auth.resetTitle };
}

// Reached from /auth/callback with a live recovery session. A direct visit
// with no session (or an expired link) gets the invalid-link state instead of
// a form that would only fail on submit.
export default async function ResetPasswordPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  const t = dict.auth;

  return (
    <AuthShell variant="login" dict={dict}>
      {user ? (
        <ResetPasswordForm dict={dict} />
      ) : (
        <>
          <span className="auth-kicker">{t.forgotKicker}</span>
          <h2>{t.resetTitle}</h2>
          <div className="auth-error" role="alert">{t.resetLinkInvalid}</div>
          <div className="auth-bottom">
            <span>
              <Link href="/forgot-password">{t.requestNewLink}</Link>
            </span>
          </div>
        </>
      )}
    </AuthShell>
  );
}
