"use client";

import { useId, useState } from "react";
import { softDeleteListingAction } from "@/app/agents/dashboard/listings/actions";

// Two-step archive control. First click reveals an inline confirmation with the
// honest reversibility copy (L-4b.15, no exclamation, calm); the confirm button
// submits the real form to softDeleteListingAction. Accessible: real <button>s,
// the confirmation region is wired via aria-describedby, focus moves to the
// confirm action when revealed.
export function ArchiveButton({ listingId }: { listingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const noteId = useId();

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setConfirming(true)}
      >
        Archive
      </button>
    );
  }

  return (
    <form action={softDeleteListingAction} className="listing-confirm">
      <input type="hidden" name="id" value={listingId} />
      <p className="help" id={noteId}>
        This listing will be moved to your archive. You can restore it anytime.
      </p>
      <div className="listing-confirm-actions">
        <button
          type="submit"
          className="btn btn-secondary btn-sm"
          aria-describedby={noteId}
          autoFocus
        >
          Move to archive
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
