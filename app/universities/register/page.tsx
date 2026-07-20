import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  UniversityRegisterForm,
  type UniversityOption,
} from "@/components/auth/university-register-form";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import { getAllUniversities } from "@/lib/data/universities";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.registerUniversity };
}

export default async function UniversityRegisterPage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);

  // A signed-in lister (agent OR university) already has a row → send them to
  // their status surface rather than a second application. Unlike agents there
  // is no orphan-recovery "complete" variant: a university with a login but no
  // agents row is vanishingly rare (the insert is the last step and the account
  // can simply re-register), so an anonymous-style apply form is enough.
  if (user) {
    const agent = await getAgentByUserId(user.id);
    if (agent && !agent.deletedAt) {
      redirect(agent.status === "approved" ? "/agents/dashboard" : "/agents/pending");
    }
    if (agent) redirect("/");
  }

  const universities = await getAllUniversities();
  // Pass raw UUID `id` (the FK target) — NOT toSearchUniversities, which remaps
  // id→slug and would break the insert.
  const options: UniversityOption[] = universities.map((u) => ({
    id: u.id,
    name: u.name,
    shortName: u.shortName,
  }));

  return (
    <AuthShell variant="register" dict={dict}>
      <UniversityRegisterForm dict={dict} universities={options} />
    </AuthShell>
  );
}
