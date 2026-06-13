"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import type { ListingWithRelations } from "@/lib/types";

export interface SavedListItem extends ListingWithRelations {
  savedAt: string;
}

interface SavedListProps {
  initial: SavedListItem[];
}

export function SavedList({ initial }: SavedListProps) {
  const [items, setItems] = useState<SavedListItem[]>(initial);
  const [optimisticItems, removeOptimistic] = useOptimistic<
    SavedListItem[],
    string
  >(items, (state, removeId) =>
    state.filter((i) => i.listing.id !== removeId),
  );
  const [, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

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
        <span className="account-page-kicker">Your account</span>
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
          {/* Unsaving collapses the row (height + fade) instead of blinking out */}
          <AnimatePresence initial={false}>
            {optimisticItems.map((item, i) => (
              <motion.li
                key={item.listing.id}
                className="saved-list-item"
                style={{ "--i": i } as React.CSSProperties}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }
                }
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <ListingCard
                  listing={item.listing}
                  agent={item.agent}
                  area={item.area}
                  variant="horizontal"
                  initialSaved
                  signedIn
                  onHeartToggled={(saved) =>
                    handleToggled(item.listing.id, saved)
                  }
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}
