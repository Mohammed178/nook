"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { publicPhotoUrl } from "@/lib/data/_row-mappers";
import { Icon } from "@/components/nook/icon";
import {
  addListingPhotoAction,
  removeListingPhotoAction,
  reorderListingPhotosAction,
} from "@/app/agents/dashboard/listings/actions";
import type { ListingPhoto } from "@/lib/data/agent-listings";

// Per-listing photo manager (4c-B1). Two-step write: the browser client uploads
// the (downscaled) bytes to the listing-photos bucket under the agent's session
// - storage RLS (0015) enforces ownership, then a server action records the
// listing_photos row. No service-role anywhere.
//
// Bucket limits (mime jpeg/png/webp, 5 MiB) are the real enforcement; the client
// validation + downscale here are UX so the agent fails fast and uploads small.

const MAX_PHOTOS = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;
const BUCKET = "listing-photos";

// Downscale to a JPEG capped at MAX_EDGE on the longest side. createImageBitmap
// decodes jpeg/png/webp; the canvas re-encodes to a single normalized format so
// every stored object is a predictable .jpg.
async function downscaleToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Your browser could not process the image.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the image.")),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

interface PhotoManagerProps {
  listingId: string;
  initialPhotos: ListingPhoto[];
}

export function PhotoManager({ listingId, initialPhotos }: PhotoManagerProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<ListingPhoto[]>(initialPhotos);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atMax = photos.length >= MAX_PHOTOS;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const chosen = e.target.files?.[0] ?? null;
    if (chosen && !ACCEPTED_TYPES.includes(chosen.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      setFile(null);
      return;
    }
    setFile(chosen);
  }

  function resetPending() {
    setFile(null);
    setAltText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onAdd() {
    setError(null);
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    const alt = altText.trim();
    if (!alt) {
      setError("Add alt text describing the photo.");
      return;
    }
    if (atMax) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      let blob: Blob;
      try {
        blob = await downscaleToJpeg(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not process the image.");
        return;
      }

      const photoUuid = crypto.randomUUID();
      const path = `${listingId}/${photoUuid}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadErr) {
        setError("Upload failed. Check the file and try again.");
        return;
      }

      const result = await addListingPhotoAction(listingId, path, alt);
      if (!result.ok || !result.id) {
        // Roll back the orphaned object so a retry is clean.
        await supabase.storage.from(BUCKET).remove([path]);
        setError(result.error ?? "Could not save the photo.");
        return;
      }

      setPhotos((prev) => [
        ...prev,
        { id: result.id!, storagePath: path, altText: alt, sortOrder: prev.length },
      ]);
      resetPending();
      router.refresh();
    });
  }

  function onRemove(photoId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeListingPhotoAction(listingId, photoId);
      if (!result.ok) {
        setError(result.error ?? "Could not remove the photo.");
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      router.refresh();
    });
  }

  function onMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    setError(null);

    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((p, i) => ({ ...p, sortOrder: i }));
    setPhotos(reordered);

    startTransition(async () => {
      const result = await reorderListingPhotosAction(
        listingId,
        reordered.map((p) => p.id),
      );
      if (!result.ok) {
        setError(result.error ?? "Could not reorder the photos.");
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="photo-manager">
      {error ? (
        <div className="auth-error" role="alert">
          {error}
        </div>
      ) : null}

      {photos.length === 0 ? (
        <p className="help">
          No photos yet. Add at least one, a listing needs a photo before it can
          be published.
        </p>
      ) : (
        <ul className="photo-grid">
          {photos.map((p, i) => (
            <li key={p.id} className="photo-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="photo-tile-img"
                src={publicPhotoUrl(p.storagePath)}
                alt={p.altText}
              />
              <div className="photo-tile-actions">
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onMove(i, -1)}
                  disabled={pending || i === 0}
                  aria-label={`Move photo ${i + 1} earlier`}
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onMove(i, 1)}
                  disabled={pending || i === photos.length - 1}
                  aria-label={`Move photo ${i + 1} later`}
                >
                  <Icon name="chevron-right" size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onRemove(p.id)}
                  disabled={pending}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="photo-add">
        <div className="field">
          <label className="label" htmlFor="pm-file">
            Add a photo
          </label>
          <input
            id="pm-file"
            ref={fileInputRef}
            className="input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            disabled={pending || atMax}
          />
          <div className="help">
            JPEG, PNG, or WebP, up to 5 MB. {photos.length}/{MAX_PHOTOS} added.
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="pm-alt">
            Alt text (describe the photo)
          </label>
          <input
            id="pm-alt"
            className="input"
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="e.g. Bright living room with balcony"
            disabled={pending || atMax}
            aria-describedby="pm-alt-help"
          />
          <div className="help" id="pm-alt-help">
            Required, used by screen readers and shown if the image fails to load.
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onAdd}
          disabled={pending || atMax || !file || !altText.trim()}
        >
          {pending ? "Working…" : "Add photo"}
        </button>
      </div>
    </div>
  );
}
