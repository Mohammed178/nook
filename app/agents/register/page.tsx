import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AgentRegisterForm } from "@/components/auth/agent-register-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Register your agency · Nook",
};

export default async function AgentRegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <AuthShell variant="register">
      <AgentRegisterForm />
    </AuthShell>
  );
}
