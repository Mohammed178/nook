import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentListingById } from "@/lib/data/agent-listings";
import { getAllAreas } from "@/lib/data/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { ListingForm } from "@/components/agents/listing-form";

export const metadata = {
  title: "Edit listing · Nook",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, areas] = await Promise.all([
    getAgentListingById(id),
    getAllAreas(),
  ]);

  // Owner-read RLS returns null for a listing the caller does not own (or one
  // that does not exist) — both collapse to notFound(), so an agent cannot probe
  // another agent's listing ids.
  if (!listing) notFound();

  return (
    <div className="dashboard-page dashboard-form-page">
      <header className="account-content-head">
        <h1>Edit listing</h1>
        <Link href="/agents/dashboard" className="btn btn-ghost btn-sm">
          Back to listings
        </Link>
      </header>
      <ListingForm areas={areas} universities={UNIVERSITIES} listing={listing} />
    </div>
  );
}
