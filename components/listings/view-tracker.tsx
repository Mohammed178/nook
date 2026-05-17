"use client";

import { useEffect, useRef } from "react";
import { recordViewAction } from "@/app/listings/actions";

interface ViewTrackerProps {
  listingId: string;
}

/**
 * Fires recordViewAction once per mount + listingId. Ref guard absorbs
 * StrictMode double-mount in dev (upsert is also idempotent server-side).
 * Signed-out users: action no-ops silently.
 */
export function ViewTracker({ listingId }: ViewTrackerProps) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === listingId) return;
    firedFor.current = listingId;
    void recordViewAction(listingId);
  }, [listingId]);

  return null;
}
