import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgentListingById,
  getListingPhotos,
} from "@/lib/data/agent-listings";
import { getAllAreas } from "@/lib/data/areas";
import { ListingForm } from "@/components/agents/listing-form";
import { PhotoManager } from "@/components/agents/photo-manager";
import { MapPicker } from "@/components/agents/map-picker";
import { PublishControl } from "@/components/agents/publish-control";

export const metadata = {
  title: "Edit listing · Nook",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, areas, photos] = await Promise.all([
    getAgentListingById(id),
    getAllAreas(),
    getListingPhotos(id),
  ]);

  // Owner-read RLS returns null for a listing the caller does not own (or one
  // that does not exist), both collapse to notFound(), so an agent cannot probe
  // another agent's listing ids.
  if (!listing) notFound();

  return (
    <div className="dashboard-page dashboard-form-page">
      <header className="account-content-head">
        <div className="account-content-head-titles">
          <span className="account-content-kicker">Agent dashboard</span>
          <h1>Edit listing</h1>
        </div>
        <Link href="/agents/dashboard" className="btn btn-ghost btn-sm">
          Back to listings
        </Link>
      </header>

      <section className="dashboard-form-section" aria-labelledby="photos-heading">
        <h2 id="photos-heading">Photos</h2>
        <PhotoManager listingId={listing.id} initialPhotos={photos} />
      </section>

      <section className="dashboard-form-section" aria-labelledby="details-heading">
        <h2 id="details-heading">Details</h2>
        <ListingForm areas={areas} listing={listing} />
      </section>

      <section className="dashboard-form-section" aria-labelledby="location-heading">
        <h2 id="location-heading">Location</h2>
        <MapPicker
          listingId={listing.id}
          initialLat={listing.lat ?? null}
          initialLng={listing.lng ?? null}
        />
      </section>

      <section className="dashboard-form-section" aria-labelledby="publish-heading">
        <h2 id="publish-heading">Publish</h2>
        <PublishControl listingId={listing.id} status={listing.status} />
      </section>
    </div>
  );
}
