"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import type { SavedListing } from "@/lib/favourites";

interface SavedListProps {
  initial: SavedListing[];
}

export function SavedList({ initial }: SavedListProps) {
  const [items, setItems] = useState<SavedListing[]>(initial);
  const [optimisticItems, removeOptimistic] = useOptimistic<
    SavedListing[],
    string
  >(items, (state, removeId) =>
    state.filter((i) => i.listing.id !== removeId),
  );
  const [, startTransition] = useTransition();

  function handleToggled(listingId: string, saved: boolean) {
    if (saved) return;
    startTransition(() => {
      removeOptimistic(listingId);
      setItems((prev) => prev.filter((i) => i.listing.id !== listingId));
    });
  }

  const count = optimisticItems.length;

  return (
    <>
      <header className="account-page-head">
        <h1>Saved listings</h1>
        <p className="account-page-sub">
          {count === 0
            ? "Nothing saved yet."
            : `${count} saved · tap the heart to unsave.`}
        </p>
      </header>

      {count === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon" aria-hidden="true">
            <Icon name="heart" size={28} />
          </span>
          <h2>No saved listings yet</h2>
          <p>Tap the heart on any listing to save it here.</p>
          <Link href="/listings" className="btn btn-primary">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="saved-list">
          {optimisticItems.map((item) => (
            <li key={item.listing.id} className="saved-list-item">
              <ListingCard
                listing={item.listing}
                variant="horizontal"
                initialSaved
                signedIn
                onHeartToggled={(saved) =>
                  handleToggled(item.listing.id, saved)
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
