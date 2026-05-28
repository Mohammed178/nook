import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Sign in · Nook",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <>
      <div className="auth-topbar">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <span className="logo-mark">N</span>
          <span>nook</span>
        </Link>
        <div className="auth-topbar-right">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-topbar-link">
            Create one
          </Link>
          {"  ·  "}Want to list a property?{" "}
          <Link href="/agents/register" className="auth-topbar-link">
            Register as an agent
          </Link>
        </div>
      </div>
      <AuthShell variant="login">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthShell>
    </>
  );
}
