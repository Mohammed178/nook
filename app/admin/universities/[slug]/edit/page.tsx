import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UniversityForm } from "@/components/admin/university-form";
import { getUniversityAdmin } from "../../_data";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.editUniversity };
}

export default async function EditUniversityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [uni, dict] = await Promise.all([
    getUniversityAdmin(slug),
    getDictionary(),
  ]);
  if (!uni) notFound();
  const { admin } = dict;

  return (
    <div>
      <div className="account-page-head">
        <span className="account-page-kicker">{admin.trustSafety}</span>
        <h1>
          {admin.uni.edit} · {uni.shortName}
        </h1>
      </div>
      <UniversityForm mode="edit" initial={uni} />
    </div>
  );
}
