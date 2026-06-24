"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { publicVideoUrl } from "@/lib/data/_row-mappers";
import { Icon } from "@/components/nook/icon";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import {
  addListingVideosAction,
  removeListingVideoAction,
} from "@/app/agents/dashboard/listings/actions";
import type { ListingVideo } from "@/lib/data/agent-listings";

// Per-listing video manager (4d). Mirrors the photo manager, with the video
// realities: there is NO in-browser downscale/transcode for video, so the bytes
// are uploaded as-is and the bucket's 100 MiB + mime allow-list (migration 0029)
// are the real ceiling — the client checks here are UX (fail fast on type/size).
// The agent stages up to MAX_VIDEOS clips, each with a required title (a11y
// caption), then the browser client uploads to the listing-videos bucket under
// the agent's session (storage RLS), and a single server action records the rows.
// The 2-per-listing cap is DB-enforced (NK003); the client mirrors it for UX.

const MAX_VIDEOS = 2;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MiB, matches the bucket limit
const ACCEPTED_TYPES = ["video/mp4", "video/webm"];
const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const BUCKET = "listing-videos";

interface StagedVideo {
  key: string;
  file: File;
  title: string;
}

interface VideoManagerProps {
  listingId: string;
  initialVideos: ListingVideo[];
}

export function VideoManager({ listingId, initialVideos }: VideoManagerProps) {
  const t = useDict().videoManager;
  const router = useRouter();
  const [videos, setVideos] = useState<ListingVideo[]>(initialVideos);
  const [staged, setStaged] = useState<StagedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_VIDEOS - videos.length - staged.length;
  const atMax = videos.length + staged.length >= MAX_VIDEOS;
  const allStagedHaveTitle = staged.every((s) => s.title.trim());

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const chosen = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (chosen.length === 0) return;

    if (chosen.some((f) => !ACCEPTED_TYPES.includes(f.type))) {
      setError(t.chooseVideoType);
      return;
    }
    if (chosen.some((f) => f.size > MAX_VIDEO_BYTES)) {
      setError(t.tooLarge);
      return;
    }

    if (remaining <= 0) {
      setError(format(t.batchFull, { max: MAX_VIDEOS }));
      return;
    }
    const accepted = chosen.slice(0, remaining);
    if (accepted.length < chosen.length) {
      setError(format(t.someSkipped, { n: accepted.length }));
    }
    setStaged((prev) => [
      ...prev,
      ...accepted.map((file) => ({ key: crypto.randomUUID(), file, title: "" })),
    ]);
  }

  function setStagedTitle(key: string, title: string) {
    setStaged((prev) => prev.map((s) => (s.key === key ? { ...s, title } : s)));
  }

  function removeStaged(key: string) {
    setError(null);
    setStaged((prev) => prev.filter((s) => s.key !== key));
  }

  function onUpload() {
    setError(null);
    if (staged.length === 0) {
      setError(t.chooseVideoFirst);
      return;
    }
    if (!allStagedHaveTitle) {
      setError(t.addTitleAll);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      // Sequential upload: clips are large, so one at a time keeps the browser's
      // bandwidth focused and failures unambiguous. null = this one failed.
      const uploaded: ({ path: string; title: string } | null)[] = [];
      for (const s of staged) {
        const ext = EXT_BY_TYPE[s.file.type] ?? "mp4";
        const path = `${listingId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, s.file, { contentType: s.file.type, upsert: false });
        uploaded.push(uploadErr ? null : { path, title: s.title.trim() });
      }

      const ok = uploaded.filter(
        (u): u is { path: string; title: string } => u !== null,
      );

      // All-or-nothing: roll back any that landed and bail, so the agent retries
      // a clean set.
      if (ok.length < staged.length) {
        if (ok.length > 0) {
          await supabase.storage.from(BUCKET).remove(ok.map((u) => u.path));
        }
        setError(t.uploadFailed);
        return;
      }

      const result = await addListingVideosAction(
        listingId,
        ok.map((u) => ({ storagePath: u.path, title: u.title })),
      );
      if (!result.ok || !result.videos) {
        await supabase.storage.from(BUCKET).remove(ok.map((u) => u.path));
        setError(result.error ?? t.couldNotSave);
        return;
      }

      setVideos((prev) => [
        ...prev,
        ...result.videos!.map((v) => {
          const src = ok.find((u) => u.path === v.storagePath);
          return {
            id: v.id,
            storagePath: v.storagePath,
            title: src?.title ?? "",
            sortOrder: v.sortOrder,
          };
        }),
      ]);
      setStaged([]);
      router.refresh();
    });
  }

  function onRemove(videoId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeListingVideoAction(listingId, videoId);
      if (!result.ok) {
        setError(result.error ?? t.couldNotRemove);
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
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

      {videos.length === 0 ? (
        <p className="help">{format(t.noVideos, { max: MAX_VIDEOS })}</p>
      ) : (
        <ul className="video-grid">
          {videos.map((v, i) => (
            <li key={v.id} className="video-tile">
              <video
                className="video-tile-player"
                src={publicVideoUrl(v.storagePath)}
                controls
                preload="metadata"
                aria-label={v.title}
              />
              <div className="video-tile-foot">
                <span className="video-tile-title" title={v.title}>
                  {v.title}
                </span>
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={() => onRemove(v.id)}
                  disabled={pending}
                  aria-label={format(t.removeVideo, { n: i + 1 })}
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
          <label className="label" htmlFor="vm-file">
            {t.addVideos}
          </label>
          <input
            id="vm-file"
            ref={fileInputRef}
            className="input"
            type="file"
            accept="video/mp4,video/webm"
            multiple
            onChange={onFileChange}
            disabled={pending || atMax}
          />
          <div className="help">
            {format(t.fileHelp, { count: videos.length, max: MAX_VIDEOS })}
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
                  <label className="label" htmlFor={`vm-title-${s.key}`}>
                    {format(t.titleLabel, { n: i + 1 })}
                  </label>
                  <input
                    id={`vm-title-${s.key}`}
                    className="input"
                    type="text"
                    value={s.title}
                    onChange={(e) => setStagedTitle(s.key, e.target.value)}
                    placeholder={t.titlePlaceholder}
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

        <div className="help">{t.titleHelp}</div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onUpload}
          disabled={pending || staged.length === 0 || !allStagedHaveTitle}
        >
          {pending
            ? t.working
            : staged.length > 1
              ? format(t.addVideosN, { count: staged.length })
              : t.addVideo}
        </button>
      </div>
    </div>
  );
}
