"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/nook/icon";
import {
  updateAvatarAction,
  removeAvatarAction,
} from "@/app/account/profile/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// Profile avatar picker. The browser uploads the image straight to the avatars
// bucket under {userId}/{uuid}.{ext} (storage RLS gates the write to the caller's
// own folder), then a server action records the path on profiles.avatar_url and
// removes the previous object. Client type/size checks are UX (fail fast); the
// bucket's mime allow-list + 5 MiB limit (migration 0030) are the real ceiling.

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MiB, matches the bucket limit
const BUCKET = "avatars";

interface AvatarUploaderProps {
  userId: string;
  initialAvatarUrl: string | null;
  displayName: string;
  dict: Dictionary;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function AvatarUploader({
  userId,
  initialAvatarUrl,
  displayName,
  dict,
}: AvatarUploaderProps) {
  const a = dict.account;
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(a.avatarType);
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(a.avatarTooLarge);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const ext = EXT_BY_TYPE[file.type] ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) {
        setError(a.avatarUploadFailed);
        return;
      }

      const result = await updateAvatarAction(path);
      if (!result.ok || !result.avatarUrl) {
        // Roll back the orphan object the server did not adopt.
        await supabase.storage.from(BUCKET).remove([path]);
        setError(result.error ?? a.avatarSaveFailed);
        return;
      }

      setAvatarUrl(result.avatarUrl);
      router.refresh();
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) {
        setError(result.error ?? a.avatarSaveFailed);
        return;
      }
      setAvatarUrl(null);
      router.refresh();
    });
  }

  return (
    <div className="avatar-uploader">
      <div className="avatar-preview">
        {avatarUrl ? (
          // Public-bucket URL on a Supabase host; next/image remote patterns are
          // not set up for it and this is a small fixed-size image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="avatar-preview-img"
            src={avatarUrl}
            alt={a.avatarAlt}
          />
        ) : (
          <span className="avatar-preview-initials" aria-hidden="true">
            {initials(displayName)}
          </span>
        )}
      </div>

      <div className="avatar-uploader-body">
        <label className="label" htmlFor="avatar-file">
          {a.avatarLabel}
        </label>
        <div className="avatar-uploader-actions">
          <label
            className={`btn btn-secondary btn-sm${pending ? " is-disabled" : ""}`}
          >
            <Icon name="camera" size={14} />
            {avatarUrl ? a.avatarChange : a.avatarUpload}
            <input
              id="avatar-file"
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              disabled={pending}
            />
          </label>
          {avatarUrl ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRemove}
              disabled={pending}
            >
              {a.avatarRemove}
            </button>
          ) : null}
        </div>
        <div className="help">{a.avatarHelp}</div>
        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
