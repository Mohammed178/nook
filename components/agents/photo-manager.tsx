"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { publicPhotoUrl, sizedPhotoUrl } from "@/lib/data/_row-mappers";
import { Icon } from "@/components/nook/icon";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import {
  addListingPhotosAction,
  removeListingPhotoAction,
  reorderListingPhotosAction,
} from "@/app/agents/dashboard/listings/actions";
import type { ListingPhoto } from "@/lib/data/agent-listings";

// Per-listing photo manager (4c-B1; multi-upload 4d). The agent stages up to
// MAX_BATCH files at once, each with its own required alt text, then the browser
// client uploads the (downscaled) bytes to the listing-photos bucket under the
// agent's session — storage RLS (0015) enforces ownership — and a SINGLE server
// action records all the listing_photos rows in one multi-row insert + one cache
// revalidate. No service-role anywhere.
//
// Why batch: recording N photos in one insert (vs N sequential adds) is one DB
// round-trip and one global getAllListings cache bust instead of N — the bit that
// actually matters when many agents publish concurrently. Byte transfer never
// touches the Next server (browser → storage direct), so the server is not the
// upload bottleneck. Decode/encode is main-thread, so we throttle it to
// DECODE_CONCURRENCY to keep low-end phones responsive.
//
// Bucket limits (mime jpeg/png/webp, 5 MiB) are the real enforcement; the client
// validation + downscale here are UX so the agent fails fast and uploads small.

const MAX_PHOTOS = 6;
const MAX_BATCH = 4; // most files an agent may stage/upload in one go
const DECODE_CONCURRENCY = 2; // parallel canvas decodes, capped for weak devices
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

// Run `task` over items with at most `limit` in flight, preserving result order.
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await task(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// A file staged for upload, with its own alt text and a stable key for React.
interface StagedPhoto {
  key: string;
  file: File;
  alt: string;
}

interface PhotoManagerProps {
  listingId: string;
  initialPhotos: ListingPhoto[];
}

export function PhotoManager({ listingId, initialPhotos }: PhotoManagerProps) {
  const t = useDict().photoManager;
  const router = useRouter();
  const [photos, setPhotos] = useState<ListingPhoto[]>(initialPhotos);
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slots still free across the whole listing, and within a single batch.
  const remaining = MAX_PHOTOS - photos.length - staged.length;
  const atMax = photos.length + staged.length >= MAX_PHOTOS;
  const allStagedHaveAlt = staged.every((s) => s.alt.trim());

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const chosen = Array.from(e.target.files ?? []);
    // Reset the native input so re-selecting the same file fires onChange again.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (chosen.length === 0) return;

    if (chosen.some((f) => !ACCEPTED_TYPES.includes(f.type))) {
      setError(t.chooseImageType);
      return;
    }

    const room = Math.min(remaining, MAX_BATCH - staged.length);
    if (room <= 0) {
      setError(format(t.batchFull, { batch: MAX_BATCH, max: MAX_PHOTOS }));
      return;
    }
    const accepted = chosen.slice(0, room);
    if (accepted.length < chosen.length) {
      setError(format(t.someSkipped, { n: accepted.length }));
    }
    setStaged((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        key: crypto.randomUUID(),
        file,
        alt: "",
      })),
    ]);
  }

  function setStagedAlt(key: string, alt: string) {
    setStaged((prev) => prev.map((s) => (s.key === key ? { ...s, alt } : s)));
  }

  function removeStaged(key: string) {
    setError(null);
    setStaged((prev) => prev.filter((s) => s.key !== key));
  }

  function onUpload() {
    setError(null);
    if (staged.length === 0) {
      setError(t.chooseImageFirst);
      return;
    }
    if (!allStagedHaveAlt) {
      setError(t.addAltAll);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      // Decode + upload each staged file (throttled). null = this one failed.
      const uploaded = await mapLimit(staged, DECODE_CONCURRENCY, async (s) => {
        let blob: Blob;
        try {
          blob = await downscaleToJpeg(s.file);
        } catch {
          return null;
        }
        const path = `${listingId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadErr) return null;
        return { path, alt: s.alt.trim() };
      });

      const ok = uploaded.filter(
        (u): u is { path: string; alt: string } => u !== null,
      );

      // All-or-nothing: if any failed, roll back the ones that landed and bail,
      // so the agent retries a clean, consistent set (no half-added batch).
      if (ok.length < staged.length) {
        if (ok.length > 0) {
          await supabase.storage.from(BUCKET).remove(ok.map((u) => u.path));
        }
        setError(t.uploadFailed);
        return;
      }

      const result = await addListingPhotosAction(
        listingId,
        ok.map((u) => ({ storagePath: u.path, altText: u.alt })),
      );
      if (!result.ok || !result.photos) {
        // Record step failed — remove the now-orphaned objects.
        await supabase.storage.from(BUCKET).remove(ok.map((u) => u.path));
        setError(result.error ?? t.couldNotSave);
        return;
      }

      setPhotos((prev) => [
        ...prev,
        ...result.photos!.map((p) => {
          const src = ok.find((u) => u.path === p.storagePath);
          return {
            id: p.id,
            storagePath: p.storagePath,
            altText: src?.alt ?? "",
            sortOrder: p.sortOrder,
          };
        }),
      ]);
      setStaged([]);
      router.refresh();
    });
  }

  function onRemove(photoId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeListingPhotoAction(listingId, photoId);
      if (!result.ok) {
        setError(result.error ?? t.couldNotRemove);
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
        setError(result.error ?? t.couldNotReorder);
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
        <p className="help">{t.noPhotos}</p>
      ) : (
        <ul className="photo-grid">
          {photos.map((p, i) => (
            <li key={p.id} className="photo-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="photo-tile-img"
                src={sizedPhotoUrl(publicPhotoUrl(p.storagePath), 320)}
                alt={p.altText}
                loading={i > 5 ? "lazy" : undefined}
              />
              <div className="photo-tile-actions">
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onMove(i, -1)}
                  disabled={pending || i === 0}
                  aria-label={format(t.movePhotoEarlier, { n: i + 1 })}
                >
                  <Icon name="chevron-left" size={16} className="rtl-flip" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onMove(i, 1)}
                  disabled={pending || i === photos.length - 1}
                  aria-label={format(t.movePhotoLater, { n: i + 1 })}
                >
                  <Icon name="chevron-right" size={16} className="rtl-flip" />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onRemove(p.id)}
                  disabled={pending}
                  aria-label={format(t.removePhoto, { n: i + 1 })}
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
            {t.addPhotos}
          </label>
          <input
            id="pm-file"
            ref={fileInputRef}
            className="input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFileChange}
            disabled={pending || atMax}
          />
          <div className="help">
            {format(t.fileHelpMulti, {
              batch: MAX_BATCH,
              count: photos.length,
              max: MAX_PHOTOS,
            })}
          </div>
        </div>

        {staged.length > 0 ? (
          <ul className="photo-stage">
            {staged.map((s, i) => (
              <li key={s.key} className="photo-stage-row">
                <span className="photo-stage-name" title={s.file.name}>
                  {s.file.name}
                </span>
                <div className="field photo-stage-alt">
                  <label className="label" htmlFor={`pm-alt-${s.key}`}>
                    {format(t.altForPhoto, { n: i + 1 })}
                  </label>
                  <input
                    id={`pm-alt-${s.key}`}
                    className="input"
                    type="text"
                    value={s.alt}
                    onChange={(e) => setStagedAlt(s.key, e.target.value)}
                    placeholder={t.altPlaceholder}
                    disabled={pending}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => removeStaged(s.key)}
                  disabled={pending}
                  aria-label={format(t.removeStaged, { name: s.file.name })}
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="help" id="pm-alt-help">
          {t.altHelp}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onUpload}
          disabled={pending || staged.length === 0 || !allStagedHaveAlt}
        >
          {pending
            ? t.working
            : staged.length > 1
              ? format(t.addPhotosN, { count: staged.length })
              : t.addPhoto}
        </button>
      </div>
    </div>
  );
}
