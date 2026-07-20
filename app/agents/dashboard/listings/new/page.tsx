import type { Metadata } from "next";
import Link from "next/link";
import { getAllAreas } from "@/lib/data/areas";
import { ListingForm } from "@/components/agents/listing-form";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import { isUniversityLister } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.newListing };
}

export default async function NewListingPage() {
  const [areas, dict, user] = await Promise.all([
    getAllAreas(),
    getDictionary(),
    getCurrentUser(),
  ]);
  const t = dict.agents;
  // University listers get the on-campus toggle; the denormalized agency holds
  // the university name for the read-only summary.
  const agent = user ? await getAgentByUserId(user.id) : null;
  const isUniversity = agent ? isUniversityLister(agent) : false;

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
      <ListingForm
        areas={areas}
        isUniversity={isUniversity}
        universityName={agent?.agency}
      />
    </div>
  );
}
