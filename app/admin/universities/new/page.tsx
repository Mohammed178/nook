import type { Metadata } from "next";
import { UniversityForm } from "@/components/admin/university-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.newUniversity };
}

export default async function NewUniversityPage() {
  const { admin } = await getDictionary();

  return (
    <div>
      <div className="account-page-head">
        <span className="account-page-kicker">{admin.trustSafety}</span>
        <h1>{admin.uni.add}</h1>
      </div>
      <UniversityForm mode="create" />
    </div>
  );
}
