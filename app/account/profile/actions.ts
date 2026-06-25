"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { getUniversityBySlug } from "@/lib/data/universities";
import { publicAvatarUrl } from "@/lib/data/_row-mappers";
import { getDictionary } from "@/lib/i18n/server";

const VALID_GENDERS = new Set(["female", "male", "mixed"]);

// Avatar object paths the client may have uploaded. The browser uploads to the
// avatars bucket under {user_id}/{uuid}.{ext} (storage RLS forbids any other
// folder); the action re-validates the shape so a stored avatar_url can never be
// anything but an owned object with an allowed extension. The bucket itself caps
// mime + size (migration 0030); these checks defend the DB column.
const AVATAR_PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i;

export async function updateProfileAction(
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const universityIdRaw = String(formData.get("university_id") ?? "").trim();
  const genderRaw = String(formData.get("gender_preference") ?? "").trim();

  const dict = await getDictionary();
  const a = dict.account;

  if (!displayName) {
    return { error: a.displayNameRequired };
  }
  if (universityIdRaw && !(await getUniversityBySlug(universityIdRaw))) {
    return { error: a.pickUniversity };
  }

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: a.notSignedIn };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      phone: phone || null,
      country: country || null,
      university_id: universityIdRaw || null,
      gender_preference: VALID_GENDERS.has(genderRaw) ? genderRaw : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}

// Records an already-uploaded avatar object as the user's avatar. The client
// uploads the bytes to the avatars bucket (storage RLS gates the write to the
// caller's own {uid}/ folder) and passes back the storage path; this verifies
// the path is shaped like an owned object, points at THIS user's folder, then
// writes it to profiles.avatar_url and removes the previous object. The URL the
// app renders is always built server-side by publicAvatarUrl from this validated
// path — a client never controls the stored URL.
export async function updateAvatarAction(
  storagePath: string,
): Promise<{ error?: string; ok?: true; avatarUrl?: string }> {
  const dict = await getDictionary();
  const a = dict.account;

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: a.notSignedIn };

  const path = String(storagePath ?? "").trim();
  // Must be {uid}/{uuid}.{ext} AND the uid segment must be THIS user's id.
  if (!AVATAR_PATH_RE.test(path) || path.split("/")[0] !== user.id) {
    return { error: a.avatarInvalid };
  }

  // Read the current avatar to delete it after a successful swap (best-effort).
  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const previous = existing?.avatar_url ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: path, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: a.avatarSaveFailed };

  // Remove the old object so the bucket does not accumulate orphans. Owner-delete
  // storage RLS scopes this to the user's folder; a failure is non-fatal.
  if (previous && previous !== path) {
    await supabase.storage.from("avatars").remove([previous]);
  }

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true, avatarUrl: publicAvatarUrl(path) };
}

// Clears the avatar: nulls the column and deletes the object.
export async function removeAvatarAction(): Promise<{
  error?: string;
  ok?: true;
}> {
  const dict = await getDictionary();
  const a = dict.account;

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: a.notSignedIn };

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const previous = existing?.avatar_url ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: a.avatarSaveFailed };

  if (previous) {
    await supabase.storage.from("avatars").remove([previous]);
  }

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}
