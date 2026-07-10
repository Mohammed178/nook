import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { auth } = await getDictionary();
  return { title: auth.forgotTitle };
}

export default async function ForgotPasswordPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (user) redirect("/account");

  return (
    <AuthShell variant="login" dict={dict}>
      <Suspense fallback={null}>
        <ForgotPasswordForm dict={dict} />
      </Suspense>
    </AuthShell>
  );
}
