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
