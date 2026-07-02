"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createBareClient } from "@supabase/supabase-js";
import { createActionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

// Self-service account deletion (0035). HARD delete: auth user, all owned rows,
// all owned storage objects. Sequence mirrors scripts/cleanup-ephemeral.mjs
// (demote listings -> delete listings -> delete agents -> delete auth user),
// which is the FK-safe order: agents.user_id (0010) and listings.agent_id
// (0009) are both ON DELETE RESTRICT, so the auth user can only go last.
//
// This file is the ONLY non-admin importer of the service-role client — it is
// allowlisted by exact path in scripts/lint-service-role-containment.mjs. The
// privilege is needed because agents/listings have no owner UPDATE/DELETE
// policies (0010/0014) and auth.admin.deleteUser is a service-role API.
//
// SECURITY MODEL:
//  * Identity comes exclusively from the cookie session via auth.getUser()
//    (network-verified, not a stale JWT decode). There are NO client-supplied
//    ids anywhere in this action — agent/listing ids are resolved server-side
//    from that user id, so there is no IDOR surface and nothing to UUID-parse.
//  * Admins are refused server-side regardless of UI hiding.
//  * A LIVE agent must re-prove the password (hijack-proof gate). The check
//    runs on a throwaway cookie-free anon client so the caller's session is
//    never touched; GoTrue's built-in sign-in rate limits throttle brute force.
//    The server decides whether the password is required (live agents row via
//    service role) — a client flag is never trusted.
//  * A soft-deleted ("withdrawn") agents row presents as a student in the UI,
//    but it still blocks auth deletion via the RESTRICT FK — the sweep below
//    therefore covers ANY agents row, live or withdrawn.
//
// FAILURE MODES: every step is idempotent; "retry the action" is the recovery
// story. Storage removals are best-effort (an unreachable object must not
// permanently block a data-erasure request; failures are console.error'd for
// operator cleanup). DB row deletions are fail-closed: return an error, the
// user is still signed in and can retry. auth.admin.deleteUser is strictly
// last. If it fails after the agents sweep succeeded, the retry simply takes
// the student path and completes.

const STORAGE_CHUNK = 100; // Supabase remove() batch bound

type Admin = ReturnType<typeof createAdminClient>;

// Best-effort removal. Never throws; logs per-chunk failures for operator
// follow-up (orphaned objects are recoverable from these logs).
async function removeStorageObjects(
  admin: Admin,
  bucket: string,
  paths: string[],
): Promise<void> {
  const unique = [...new Set(paths)].filter(Boolean);
  for (let i = 0; i < unique.length; i += STORAGE_CHUNK) {
    const chunk = unique.slice(i, i + STORAGE_CHUNK);
    const { error } = await admin.storage.from(bucket).remove(chunk);
    if (error) {
      console.error(
        `[delete-account] storage remove failed bucket=${bucket} n=${chunk.length}: ${error.message}`,
      );
    }
  }
}

// Folder sweep: catches orphans from interrupted uploads that never got a DB
// row (the DB-derived path list alone would miss them). Best-effort.
async function listFolderPaths(
  admin: Admin,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const { data, error } = await admin.storage
    .from(bucket)
    .list(folder, { limit: 1000 });
  if (error) {
    console.error(
      `[delete-account] storage list failed bucket=${bucket} folder=${folder}: ${error.message}`,
    );
    return [];
  }
  return (data ?? [])
    .filter((o) => o.name && o.id) // folders come back with null id
    .map((o) => `${folder}/${o.name}`);
}

export async function deleteAccountAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const dict = await getDictionary();
  const a = dict.account;

  // 1. Live identity from the cookie session — the only identity input.
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: a.notSignedIn };

  // 2. Product rule: admins never self-delete (removed via ops tooling only).
  if (isAdmin(user)) return { error: a.deleteAdminRefused };

  // 3. Explicit confirmation field — the HTML dialog is bypassable on a raw
  //    POST; this server check is the real student-path gate.
  if (String(formData.get("confirm") ?? "") !== "true") {
    return { error: a.deleteFailed };
  }

  const admin = createAdminClient();

  // 4. Any agents row — live OR soft-deleted — must be swept before the auth
  //    user can go (0010 RESTRICT). Service role sees withdrawn rows too.
  const { data: agentRow, error: agentErr } = await admin
    .from("agents")
    .select("id, status, deleted_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (agentErr) {
    console.error(`[delete-account] agent lookup: ${agentErr.message}`);
    return { error: a.deleteFailed };
  }
  const liveAgent = !!agentRow && !agentRow.deleted_at;

  // 5. Hijack-proof gate for live agents: password re-entry. Throwaway anon
  //    client (no cookie adapter) so the caller's session is untouched. Email
  //    comes from the verified user, never from the form.
  if (liveAgent) {
    const password = String(formData.get("password") ?? "");
    if (!password || !user.email) return { error: a.deletePasswordWrong };
    const throwaway = createBareClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: pwError } = await throwaway.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (pwError) return { error: a.deletePasswordWrong };
  }

  // ---- agent sweep -------------------------------------------------------
  let listingsDeleted = 0;
  if (agentRow) {
    // Collect exact storage paths BEFORE deleting rows (rows are the source of
    // truth for paths; the folder sweep below only catches upload orphans).
    const { data: listings, error: listErr } = await admin
      .from("listings")
      .select("id, status")
      .eq("agent_id", agentRow.id); // includes soft-deleted listings
    if (listErr) {
      console.error(`[delete-account] listings lookup: ${listErr.message}`);
      return { error: a.deleteFailed };
    }
    const listingIds = (listings ?? []).map((l) => l.id);

    let photoPaths: string[] = [];
    let videoPaths: string[] = [];
    if (listingIds.length > 0) {
      const [photos, videos] = await Promise.all([
        admin.from("listing_photos").select("storage_path").in("listing_id", listingIds),
        admin.from("listing_videos").select("storage_path").in("listing_id", listingIds),
      ]);
      photoPaths = (photos.data ?? []).map((r) => r.storage_path);
      videoPaths = (videos.data ?? []).map((r) => r.storage_path);
    }
    const { data: docs } = await admin
      .from("agent_documents")
      .select("storage_path")
      .eq("agent_id", agentRow.id);
    const docPaths = (docs ?? []).map((r) => r.storage_path);

    // Demote published listings first (mirrors cleanup-ephemeral). 0015 P11
    // says the last-photo trigger is cascade-safe; this is belt-and-braces AND
    // pulls listings from public view before their media disappears (no broken
    // images during a partial-failure window).
    for (const l of listings ?? []) {
      if (l.status !== "draft") {
        const { error } = await admin
          .from("listings")
          .update({ status: "draft" })
          .eq("id", l.id);
        if (error) {
          console.error(`[delete-account] demote listing ${l.id}: ${error.message}`);
          return { error: a.deleteFailed };
        }
      }
    }

    // Best-effort media removal: exact DB paths + per-folder orphan sweep.
    const photoOrphans = (
      await Promise.all(
        listingIds.map((id) => listFolderPaths(admin, "listing-photos", id)),
      )
    ).flat();
    const videoOrphans = (
      await Promise.all(
        listingIds.map((id) => listFolderPaths(admin, "listing-videos", id)),
      )
    ).flat();
    const docOrphans = await listFolderPaths(admin, "agent-documents", agentRow.id);
    await removeStorageObjects(admin, "listing-photos", [...photoPaths, ...photoOrphans]);
    await removeStorageObjects(admin, "listing-videos", [...videoPaths, ...videoOrphans]);
    await removeStorageObjects(admin, "agent-documents", [...docPaths, ...docOrphans]);

    // Hard-delete listings (listing_photos/listing_videos rows CASCADE,
    // 0015/0029) then the agents row (agent_documents/phone_verifications/
    // agent_consents CASCADE, 0033). Deleting the agents row frees the BOVAEP
    // licence: the 0025 partial unique index only guards live rows, and a
    // fully deleted row occupies nothing — the deliberate reusability property
    // of 0025/0034 is preserved with no blocklist.
    if (listingIds.length > 0) {
      const { error } = await admin.from("listings").delete().in("id", listingIds);
      if (error) {
        console.error(`[delete-account] delete listings: ${error.message}`);
        return { error: a.deleteFailed };
      }
      listingsDeleted = listingIds.length;
    }
    const { error: agentDelErr } = await admin
      .from("agents")
      .delete()
      .eq("id", agentRow.id);
    if (agentDelErr) {
      // A listing inserted mid-sequence trips the 0009 RESTRICT here — clean
      // retryable error, the next attempt sweeps it.
      console.error(`[delete-account] delete agent: ${agentDelErr.message}`);
      return { error: a.deleteFailed };
    }
  }

  // ---- common tail (students, withdrawn agents, post-sweep agents) --------
  // Avatar objects: exact path from profiles + folder sweep for stale crops.
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const avatarOrphans = await listFolderPaths(admin, "avatars", user.id);
  await removeStorageObjects(admin, "avatars", [
    ...(profile?.avatar_url ? [profile.avatar_url] : []),
    ...avatarOrphans,
  ]);

  // Anonymous audit row (0035, no PII). Best-effort: metrics must never block
  // a deletion.
  const { error: auditErr } = await admin.from("account_deletions").insert({
    role: agentRow ? (liveAgent ? "agent" : "withdrawn_agent") : "student",
    agent_status: agentRow?.status ?? null,
    listings_deleted: listingsDeleted,
  });
  if (auditErr) {
    console.error(`[delete-account] audit insert: ${auditErr.message}`);
  }

  // Strictly last: the irreversible step. Cascades profiles (0001) and
  // favourites/saved_searches/recent_views (0001/0008); agents.decided_by on
  // other rows is SET NULL (0013).
  const { error: userDelErr } = await admin.auth.admin.deleteUser(user.id);
  if (userDelErr) {
    console.error(`[delete-account] delete auth user: ${userDelErr.message}`);
    return { error: a.deleteFailed };
  }

  // Clear the session cookies locally. scope:"local" skips the server-side
  // token revocation, which would 403 — the user no longer exists.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (e) {
    console.error(`[delete-account] signOut: ${e instanceof Error ? e.message : e}`);
  }

  // Public caches only hold agent/listing data; student rows are per-request
  // RLS reads. Must run BEFORE redirect (redirect throws).
  if (agentRow) {
    revalidateTag("agents", "max");
    revalidateTag("listings", "max");
    revalidatePath("/agents/dashboard");
  }

  redirect("/goodbye"); // throws — deliberately outside any try/catch
}
