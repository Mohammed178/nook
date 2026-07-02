import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.signIn };
}

export default async function LoginPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (user) {
    // Status-aware bounce, mirrors signInAction's post-login routing. An
    // already-signed-in agent revisiting /login lands on their application
    // status (or dashboard), not the student account page.
    const agent = await getAgentByUserId(user.id);
    if (agent && !agent.deletedAt) {
      redirect(agent.status === "approved" ? "/agents/dashboard" : "/agents/pending");
    }
    redirect("/account");
  }

  return (
    <AuthShell variant="login" dict={dict}>
      <Suspense fallback={null}>
        <LoginForm dict={dict} />
      </Suspense>
    </AuthShell>
  );
}
