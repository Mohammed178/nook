import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
import {
  AGENT_COLS,
  AGENT_PUBLIC_COLS,
  rowToAgent,
  rowToPublicAgent,
  type AgentRow,
  type AgentPublicRow,
} from "@/lib/data/_row-mappers";

// Public readers (Phase H2). Query the `agents_public` view, not the base table:
// the view is approved-only + safe-column, and after the 0021 cutover anon has no
// base-table SELECT at all. rowToPublicAgent fills status='approved'.
export async function getAllAgents(): Promise<Agent[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents_public")
    .select(AGENT_PUBLIC_COLS)
    .order("name");
  if (error || !data) return [];
  return (data as AgentPublicRow[]).map(rowToPublicAgent);
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents_public")
    .select(AGENT_PUBLIC_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToPublicAgent(data as AgentPublicRow);
}

export async function getAgentByUuid(uuid: string): Promise<Agent | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents_public")
    .select(AGENT_PUBLIC_COLS)
    .eq("id", uuid)
    .maybeSingle();
  if (error || !data) return null;
  return rowToPublicAgent(data as AgentPublicRow);
}

// listPendingAgents moved to app/admin/agents/_data.ts (Phase H2): the admin
// verification queue now reads via the service-role admin client, because after
// the 0021 cutover the RLS read client can no longer see pending rows
// (agents_public is approved-only; agents_self_read is own-row only). The
// service-role import is confined to app/admin/** by the containment lint, so the
// queue's data fetch lives under app/admin/ rather than here.

// Fetch the agents row owned by the calling auth user. Used by /agents/pending
// and future agent-dashboard pages (4a-2+). Returns the row for any status
// (pending/approved/rejected) as long as it is not soft-deleted — the public
// SELECT policy (deleted_at is null) lets an authenticated user read their own
// row regardless of status, so a pending agent can see their own application.
export async function getAgentByUserId(userId: string): Promise<Agent | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents")
    .select(AGENT_COLS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToAgent(data as AgentRow);
}
