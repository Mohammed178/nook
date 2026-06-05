import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent } from "@/lib/types";
import { AGENT_COLS, rowToAgent, type AgentRow } from "@/lib/data/_row-mappers";

// Admin verification queue (L-4a2.5), re-homed under app/admin/ in Phase H2.
// All pending, non-deleted agents, oldest first. Uses the SERVICE-ROLE client
// (createAdminClient), which bypasses RLS: after the 0021 cutover the RLS read
// client cannot see pending rows (agents_public is approved-only, agents_self_read
// is own-row only), so the queue must read with service-role. The service-role
// import is allowed here because this file lives under app/admin/ — the location
// the containment lint (npm run lint:service-role-containment) permits. Selects
// the full AGENT_COLS (service-role sees every column); decided_by/decided_at are
// excluded by AGENT_COLS as before (pending rows have both null).
export async function listPendingAgents(): Promise<Agent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select(AGENT_COLS)
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true });
  if (error || !data) return [];
  return (data as AgentRow[]).map(rowToAgent);
}
