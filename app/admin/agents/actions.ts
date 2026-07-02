"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { notifyAgentDecision } from "@/lib/email/notifications";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Approve / reject mechanics (L-4a2.6). Shared core: validate → assert admin →
// service-role guarded UPDATE → notify → revalidate.
async function decide(
  agentId: string,
  status: "approved" | "rejected",
  reason: string,
): Promise<void> {
  // F5, validate the id is a UUID before any query (a malformed id otherwise
  // throws a raw Postgres error at the .eq("id", …) boundary).
  if (!UUID_RE.test(agentId)) throw new Error("Invalid agent id");

  // F2, a rejection MUST carry a reason. The HTML `required` on the form is
  // bypassable on a raw POST; this server-side throw is the real gate (LOCK-4.7:
  // rejection email + pending page both surface status_reason).
  const trimmedReason = reason.trim();
  if (status === "rejected" && !trimmedReason) {
    throw new Error("Rejection reason required");
  }

  // 1. Caller + isAdmin assert. Defence-in-depth: this throws even if route
  //    gating (middleware + layout) somehow let a non-admin reach the action.
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user)) throw new Error("Forbidden");

  // 2. Service-role client. agents has no UPDATE policy (0010), so an RLS client
  //    would affect 0 rows; service-role bypasses RLS for the privileged write.
  const admin = createAdminClient();

  // 3. Guarded UPDATE. status='pending' guard prevents double-decisions on stale
  //    tabs; deleted_at is null guard prevents deciding a withdrawn (soft-deleted)
  //    application (H5). decided_by = the admin's auth.uid(). F2: persist the
  //    reason on reject, clear it on approve. F5: stamp verified_at on approve,
  //    clear on reject.
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("agents")
    .update({
      status,
      status_reason: status === "rejected" ? trimmedReason : null,
      verified_at: status === "approved" ? nowIso : null,
      decided_by: user!.id,
      decided_at: nowIso,
    })
    .eq("id", agentId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("user_id, agency")
    .maybeSingle();
  if (error) throw new Error(error.message);

  // 4. Notify only on a real transition (data present). A no-op re-decision on a
  //    stale tab returns no row → no duplicate notification.
  if (data) {
    // LC-26, system mail goes to the agent's AUTH/login email, NOT agents.email
    // (which is the public contact and may be undeliverable, e.g. a seed agent's
    // non-routable +seed address). Resolve the login email from auth.users via the
    // service-role admin API. Best-effort: if the user/email can't be resolved, log
    // and skip the send, the decision write already succeeded.
    const { data: au, error: lookupError } = await admin.auth.admin.getUserById(
      data.user_id,
    );
    const authEmail = au?.user?.email ?? "";
    if (!authEmail) {
      console.error(
        `[agent-decision] could not resolve auth email for user=${data.user_id} ` +
          `(status=${status}); skipping notification. ${lookupError?.message ?? ""}`,
      );
    } else {
      await notifyAgentDecision({
        email: authEmail,
        status,
        agencyName: data.agency ?? "",
        statusReason: status === "rejected" ? trimmedReason : undefined,
      });
    }
  }

  // 5. Revalidate the queue. No redirect (L-4a2.6 step 5).
  revalidatePath("/admin/agents");
  // Approval/rejection changes agents_public membership; bust the cached set
  // (home featured agents, listing relation lookups, agents directory).
  revalidateTag("agents", "max");
}

export async function approveAgentAction(formData: FormData): Promise<void> {
  await decide(String(formData.get("agentId") ?? ""), "approved", "");
}

export async function rejectAgentAction(formData: FormData): Promise<void> {
  await decide(
    String(formData.get("agentId") ?? ""),
    "rejected",
    String(formData.get("reason") ?? ""),
  );
}

// Short-TTL signed URL for an agent_documents storage object. Admin-only,
// service-role (the bucket is private, no public read policy). 60-second TTL
// is intentional: the link is meant to be clicked once from the queue, not
// shared. The agent_documents row id is validated as UUID then resolved to a
// storage_path via the service-role read.
export async function getAgentDocumentLinkAction(
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!UUID_RE.test(documentId)) return { ok: false, error: "Invalid document id" };
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) return { ok: false, error: "Forbidden" };

  const admin = createAdminClient();
  const { data: row, error: rowErr } = await admin
    .from("agent_documents")
    .select("storage_path, deleted_at")
    .eq("id", documentId)
    .maybeSingle();
  if (rowErr || !row || row.deleted_at) return { ok: false, error: "Not found" };

  const { data: signed, error: signErr } = await admin.storage
    .from("agent-documents")
    .createSignedUrl(row.storage_path, 60); // 60s TTL
  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: "Could not sign URL" };
  }
  return { ok: true, url: signed.signedUrl };
}
