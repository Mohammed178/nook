import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Agent } from "@/lib/types";
import { AGENT_COLS, rowToAgent, type AgentRow } from "@/lib/data/_row-mappers";

export async function getAllAgents(): Promise<Agent[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("agents").select(AGENT_COLS).order("name");
  if (error || !data) return [];
  return (data as AgentRow[]).map(rowToAgent);
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents")
    .select(AGENT_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToAgent(data as AgentRow);
}

export async function getAgentByUuid(uuid: string): Promise<Agent | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents")
    .select(AGENT_COLS)
    .eq("id", uuid)
    .maybeSingle();
  if (error || !data) return null;
  return rowToAgent(data as AgentRow);
}

// Admin verification queue (L-4a2.5). All pending, non-deleted agents, oldest
// first. Uses the read client: agents_public_read (deleted_at is null) lets an
// authenticated admin read pending rows — no service-role needed for the LIST.
// AGENT_COLS intentionally excludes decided_by/decided_at: pending rows have
// both null, and approved/rejected list views are out of 4a-2 scope.
export async function listPendingAgents(): Promise<Agent[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents")
    .select(AGENT_COLS)
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true });
  if (error || !data) return [];
  return (data as AgentRow[]).map(rowToAgent);
}

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
