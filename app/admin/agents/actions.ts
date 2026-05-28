"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { notifyAgentDecision } from "@/lib/email/notifications";

// Approve / reject mechanics (L-4a2.6). Shared core: assert admin → service-role
// guarded UPDATE → notify → revalidate.
async function decide(
  agentId: string,
  status: "approved" | "rejected",
): Promise<void> {
  if (!agentId) throw new Error("Missing agent id");

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
  //    application (H5). decided_by = the admin's auth.uid().
  const { data, error } = await admin
    .from("agents")
    .update({
      status,
      decided_by: user!.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("email, agency")
    .maybeSingle();
  if (error) throw new Error(error.message);

  // 4. Notify only on a real transition (data present). A no-op re-decision on a
  //    stale tab returns no row → no duplicate notification.
  if (data) {
    await notifyAgentDecision({
      email: data.email ?? "",
      status,
      agencyName: data.agency ?? "",
    });
  }

  // 5. Revalidate the queue. No redirect (L-4a2.6 step 5).
  revalidatePath("/admin/agents");
}

export async function approveAgentAction(formData: FormData): Promise<void> {
  await decide(String(formData.get("agentId") ?? ""), "approved");
}

export async function rejectAgentAction(formData: FormData): Promise<void> {
  await decide(String(formData.get("agentId") ?? ""), "rejected");
}
