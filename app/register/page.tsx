import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth";
import { getAllUniversities, toSearchUniversities } from "@/lib/data/universities";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.createAccount };
}

export default async function RegisterPage() {
  const [user, dict, universities] = await Promise.all([
    getCurrentUser(),
    getDictionary(),
    getAllUniversities(),
  ]);
  if (user) redirect("/account");

  return (
    <AuthShell variant="register" dict={dict}>
      <RegisterForm
        dict={dict}
        universities={toSearchUniversities(universities)}
      />
    </AuthShell>
  );
}
