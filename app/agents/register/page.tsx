import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AgentRegisterForm } from "@/components/auth/agent-register-form";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.registerAgency };
}

export default async function AgentRegisterPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (user) redirect("/");

  return (
    <AuthShell variant="register" dict={dict}>
      <AgentRegisterForm dict={dict} />
    </AuthShell>
  );
}
