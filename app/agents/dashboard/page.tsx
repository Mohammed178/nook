import Link from "next/link";
import { getAgentListings } from "@/lib/data/agent-listings";
import { getAllAreas } from "@/lib/data/areas";
import type { Listing, ListingStatus } from "@/lib/types";
import { ArchiveButton } from "@/components/agents/archive-button";
import { restoreListingAction } from "@/app/agents/dashboard/listings/actions";

export const metadata = {
  title: "My listings · Nook",
};

const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  available: "Available",
  reserved: "Reserved",
  rented: "Rented",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(d);
}

function StatusPill({ status }: { status: ListingStatus }) {
  return (
    <span className={`pill pill-status-${status}`}>
      <span className="pill-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Practical density (PRODUCT.md): title, status, price, last updated — the facts
// an agent needs, not decorative space. Areas are resolved once for the area
// name; falls back to the stored id if the area is missing.
function ListingRow({
  listing,
  areaName,
  archived,
  index,
}: {
  listing: Listing;
  areaName: string;
  archived: boolean;
  index: number;
}) {
  return (
    <li className="listing-row" style={{ "--i": index } as React.CSSProperties}>
      <div className="listing-row-main">
        <div className="listing-row-head">
          <span className="listing-row-title">{listing.title}</span>
          <StatusPill status={listing.status} />
        </div>
        <div className="listing-row-meta">
          <span>RM {listing.priceMonthly} / month</span>
          <span aria-hidden="true">·</span>
          <span>{areaName}</span>
          <span aria-hidden="true">·</span>
          <span>Updated {formatDate(listing.updatedAt)}</span>
        </div>
      </div>
      <div className="listing-row-actions">
        {archived ? (
          <form action={restoreListingAction}>
            <input type="hidden" name="id" value={listing.id} />
            <button type="submit" className="btn btn-secondary btn-sm">
              Restore
            </button>
          </form>
        ) : (
          <>
            <Link
              href={`/agents/dashboard/listings/${listing.id}/edit`}
              className="btn btn-ghost btn-sm"
            >
              Edit
            </Link>
            <ArchiveButton listingId={listing.id} />
          </>
        )}
      </div>
    </li>
  );
}

export default async function DashboardPage() {
  const [{ live, archived }, areas] = await Promise.all([
    getAgentListings(),
    getAllAreas(),
  ]);
  const areaName = (id: string) =>
    areas.find((a) => a.id === id)?.name ?? "Area unknown";

  return (
    <div className="dashboard-page">
      <header className="account-content-head">
        <div className="account-content-head-titles">
          <span className="account-content-kicker">Agent dashboard</span>
          <h1>My listings</h1>
        </div>
        <Link
          href="/agents/dashboard/listings/new"
          className="btn btn-primary btn-sm"
        >
          New listing
        </Link>
      </header>

      <section aria-labelledby="live-heading" className="dashboard-section">
        <h2 id="live-heading" className="dashboard-section-title">
          Live
        </h2>
        {live.length === 0 ? (
          <p className="dashboard-empty">
            You have no live listings yet. Create your first draft to get
            started.
          </p>
        ) : (
          <ul className="listing-list">
            {live.map((l, i) => (
              <ListingRow
                key={l.id}
                listing={l}
                areaName={areaName(l.areaId)}
                archived={false}
                index={i}
              />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section aria-labelledby="archived-heading" className="dashboard-section">
          <h2 id="archived-heading" className="dashboard-section-title">
            Archived
          </h2>
          <p className="help">
            Archived listings are hidden from students. You can restore one at
            any time.
          </p>
          <ul className="listing-list">
            {archived.map((l, i) => (
              <ListingRow
                key={l.id}
                listing={l}
                areaName={areaName(l.areaId)}
                archived
                index={i}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
