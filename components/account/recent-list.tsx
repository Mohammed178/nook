import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import type { ListingWithRelations } from "@/lib/types";

const RECENT_DISPLAY_CAP = 20;

export interface RecentListItem extends ListingWithRelations {
  viewedAt: string;
}

interface RecentListProps {
  items: RecentListItem[];
  savedIds: Set<string>;
  signedIn: boolean;
}

export function RecentList({ items, savedIds, signedIn }: RecentListProps) {
  const count = items.length;

  return (
    <>
      <header className="account-page-head">
        <span className="account-page-kicker">Your account</span>
        <h1>Recent</h1>
        <p className="account-page-sub">
          {count === 0
            ? "No recent listings yet."
            : `${count} recently viewed${count === RECENT_DISPLAY_CAP ? ` · capped at ${RECENT_DISPLAY_CAP}` : ""}.`}
        </p>
      </header>

      {count === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon" aria-hidden="true">
            <Icon name="calendar" size={28} />
          </span>
          <h2>Nothing here yet</h2>
          <p>Listings you open will show up here, up to 20.</p>
          <Link href="/listings" className="btn btn-primary">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="saved-list">
          {items.map((item, i) => (
            <li
              key={item.listing.id}
              className="saved-list-item"
              style={{ "--i": i } as React.CSSProperties}
            >
              <ListingCard
                listing={item.listing}
                agent={item.agent}
                area={item.area}
                variant="horizontal"
                initialSaved={savedIds.has(item.listing.id)}
                signedIn={signedIn}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
