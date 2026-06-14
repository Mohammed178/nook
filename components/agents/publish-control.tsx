"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishListingAction } from "@/app/agents/dashboard/listings/actions";
import type { ListingStatus } from "@/lib/types";

// Phase 4c-B2, the deliberate go-live control on the edit page. Calls
// publishListing (draft → available) and surfaces the typed PublishResult: the
// DB triggers/CHECK are the real gate (a photo must exist, coords must be set),
// so a click that fails the preconditions comes back with a message pointing at
// the section the agent needs to fix. Already-published listings show status,
// not a publish button.

interface PublishControlProps {
  listingId: string;
  status: ListingStatus;
}

export function PublishControl({ listingId, status }: PublishControlProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (status !== "draft") {
    return (
      <p className="help">
        This listing is <strong>{status}</strong> and visible to students. Editing
        keeps it live.
      </p>
    );
  }

  function onPublish() {
    setMessage(null);
    startTransition(async () => {
      const result = await publishListingAction(listingId);
      if (result.error) {
        setMessage({ kind: "err", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: "Published, your listing is now public." });
      router.refresh();
    });
  }

  return (
    <div className="publish-control">
      <p className="help">
        Publishing makes this listing public. It needs at least one photo and a
        saved location first.
      </p>
      {message ? (
        <div
          className={message.kind === "ok" ? "field-ok" : "field-err"}
          role="alert"
        >
          {message.text}
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-primary"
        onClick={onPublish}
        disabled={pending}
      >
        {pending ? "Publishing…" : "Publish listing"}
      </button>
    </div>
  );
}
