import type { Metadata } from "next";
import Link from "next/link";
import { getAllAreas } from "@/lib/data/areas";
import { ListingForm } from "@/components/agents/listing-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.newListing };
}

export default async function NewListingPage() {
  const [areas, dict] = await Promise.all([getAllAreas(), getDictionary()]);
  const t = dict.agents;

  return (
    <div className="dashboard-page dashboard-form-page">
      <header className="account-content-head">
        <div className="account-content-head-titles">
          <span className="account-content-kicker">{dict.accountNav.agentDashboard}</span>
          <h1>{t.newListing}</h1>
        </div>
        <Link href="/agents/dashboard" className="btn btn-ghost btn-sm">
          {t.backToListings}
        </Link>
      </header>
      <ListingForm areas={areas} />
    </div>
  );
}
