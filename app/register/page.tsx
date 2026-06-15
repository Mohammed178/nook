import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.createAccount };
}

export default async function RegisterPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (user) redirect("/account");

  return (
    <AuthShell variant="register" dict={dict}>
      <RegisterForm dict={dict} />
    </AuthShell>
  );
}
