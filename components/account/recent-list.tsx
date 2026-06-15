import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { ListingWithRelations } from "@/lib/types";

const RECENT_DISPLAY_CAP = 20;

export interface RecentListItem extends ListingWithRelations {
  viewedAt: string;
}

interface RecentListProps {
  items: RecentListItem[];
  savedIds: Set<string>;
  signedIn: boolean;
  dict: Dictionary;
}

export function RecentList({ items, savedIds, signedIn, dict }: RecentListProps) {
  const count = items.length;
  const l = dict.accountLists;

  return (
    <>
      <header className="account-page-head">
        <span className="account-page-kicker">{dict.accountHome.yourAccount}</span>
        <h1>{l.recentTitle}</h1>
        <p className="account-page-sub">
          {count === 0
            ? l.noRecent
            : `${format(l.recentViewed, { count })}${count === RECENT_DISPLAY_CAP ? format(l.cappedSuffix, { cap: RECENT_DISPLAY_CAP }) : ""}.`}
        </p>
      </header>

      {count === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon" aria-hidden="true">
            <Icon name="calendar" size={28} />
          </span>
          <h2>{l.recentEmptyTitle}</h2>
          <p>{l.recentEmptyBody}</p>
          <Link href="/listings" className="btn btn-primary">
            {dict.accountHome.browseListings}
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
                card={dict.card}
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
