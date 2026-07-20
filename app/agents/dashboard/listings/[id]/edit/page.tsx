import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgentListingById,
  getListingPhotos,
  getListingVideos,
} from "@/lib/data/agent-listings";
import { getAllAreas } from "@/lib/data/areas";
import { ListingForm } from "@/components/agents/listing-form";
import { PhotoManager } from "@/components/agents/photo-manager";
import { VideoManager } from "@/components/agents/video-manager";
import { MapPicker } from "@/components/agents/map-picker";
import { PublishControl } from "@/components/agents/publish-control";
import { getCurrentUser } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/data/agents";
import { isUniversityLister } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.editListing };
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, areas, photos, videos, dict, user] = await Promise.all([
    getAgentListingById(id),
    getAllAreas(),
    getListingPhotos(id),
    getListingVideos(id),
    getDictionary(),
    getCurrentUser(),
  ]);
  const t = dict.agents;

  // Owner-read RLS returns null for a listing the caller does not own (or one
  // that does not exist), both collapse to notFound(), so an agent cannot probe
  // another agent's listing ids.
  if (!listing) notFound();

  const agent = user ? await getAgentByUserId(user.id) : null;
  const isUniversity = agent ? isUniversityLister(agent) : false;

  return (
    <div className="dashboard-page dashboard-form-page">
      <header className="account-content-head">
        <div className="account-content-head-titles">
          <span className="account-content-kicker">{dict.accountNav.agentDashboard}</span>
          <h1>{t.editListing}</h1>
        </div>
        <Link href="/agents/dashboard" className="btn btn-ghost btn-sm">
          {t.backToListings}
        </Link>
      </header>

      <section className="dashboard-form-section" aria-labelledby="photos-heading">
        <h2 id="photos-heading">{t.photos}</h2>
        <PhotoManager listingId={listing.id} initialPhotos={photos} />
      </section>

      <section className="dashboard-form-section" aria-labelledby="videos-heading">
        <h2 id="videos-heading">{t.videos}</h2>
        <VideoManager listingId={listing.id} initialVideos={videos} />
      </section>

      <section className="dashboard-form-section" aria-labelledby="details-heading">
        <h2 id="details-heading">{t.details}</h2>
        <ListingForm
          areas={areas}
          listing={listing}
          isUniversity={isUniversity}
          universityName={agent?.agency}
        />
      </section>

      <section className="dashboard-form-section" aria-labelledby="location-heading">
        <h2 id="location-heading">{t.location}</h2>
        <MapPicker
          listingId={listing.id}
          initialLat={listing.lat ?? null}
          initialLng={listing.lng ?? null}
        />
      </section>

      <section className="dashboard-form-section" aria-labelledby="publish-heading">
        <h2 id="publish-heading">{t.publish}</h2>
        <PublishControl listingId={listing.id} status={listing.status} />
      </section>
    </div>
  );
}
