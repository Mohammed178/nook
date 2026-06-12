import Link from "next/link";
import { LogoMark } from "@/components/nook/logo";
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
    <>
      <div className="auth-topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <LogoMark />
          <span>nook</span>
        </Link>
        <div className="auth-topbar-right">
          Looking for a room?{" "}
          <Link href="/register" className="auth-topbar-link">
            Create a student account
          </Link>
        </div>
      </div>
      <AuthShell variant="register">
        <AgentRegisterForm />
      </AuthShell>
    </>
  );
}
