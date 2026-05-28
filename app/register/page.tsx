import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Create your student account · Nook",
};

export default async function RegisterPage() {
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
          Already have an account?{" "}
          <Link href="/login" className="auth-topbar-link">
            Sign in
          </Link>
          {"  ·  "}Want to list a property?{" "}
          <Link href="/agents/register" className="auth-topbar-link">
            Register as an agent
          </Link>
        </div>
      </div>
      <AuthShell variant="register">
        <RegisterForm />
      </AuthShell>
    </>
  );
}
