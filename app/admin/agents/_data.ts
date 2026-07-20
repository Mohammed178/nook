import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import type { Agent } from "@/lib/types";
import { AGENT_COLS, rowToAgent, type AgentRow } from "@/lib/data/_row-mappers";

// Admin verification queue (L-4a2.5), re-homed under app/admin/ in Phase H2.
// All pending, non-deleted agents — review-ready (verification_submitted_at set)
// surface first, then any pending row that hasn't completed the stepper yet.
// Uses the SERVICE-ROLE client (createAdminClient), which bypasses RLS: after
// the 0021 cutover the RLS read client cannot see pending rows (agents_public
// is approved-only, agents_self_read is own-row only), so the queue must read
// with service-role. The service-role import is allowed here because this file
// lives under app/admin/ (the location the containment lint allows). Selects
// the full AGENT_COLS — decided_by/decided_at are excluded by AGENT_COLS as
// before (pending rows have both null).
export async function listPendingAgents(): Promise<Agent[]> {
  // A-2, in-function authz re-assert BEFORE the RLS-bypassing service-role client.
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select(AGENT_COLS)
    .eq("status", "pending")
    .is("deleted_at", null)
    // Review-ready first (verification_submitted_at IS NOT NULL, oldest first),
    // then the still-onboarding rows (NULLS LAST). Mirrors the build-prompt's
    // approved Q7 sort.
    .order("verification_submitted_at", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: true });
  if (error || !data) return [];
  return (data as AgentRow[]).map(rowToAgent);
}

// Document listing for the admin row. Reads agent_documents (service-role —
// bypasses the agent_documents owner-SELECT RLS). Surfaces ONLY non-deleted
// docs. The signed-URL resolution is in actions.ts (createSignedUrl).
export interface AdminAgentDocument {
  id: string;
  agentId: string;
  docType: "ren_cert" | "employment_letter";
  storagePath: string;
  uploadedAt: string;
}

export async function listAgentDocumentsForAdmin(
  agentIds: string[],
): Promise<Map<string, AdminAgentDocument[]>> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");
  if (agentIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_documents")
    .select("id, agent_id, doc_type, storage_path, uploaded_at")
    .in("agent_id", agentIds)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error || !data) return new Map();

  const map = new Map<string, AdminAgentDocument[]>();
  for (const row of data as Array<{
    id: string;
    agent_id: string;
    doc_type: "ren_cert" | "employment_letter";
    storage_path: string;
    uploaded_at: string;
  }>) {
    const list = map.get(row.agent_id) ?? [];
    list.push({
      id: row.id,
      agentId: row.agent_id,
      docType: row.doc_type,
      storagePath: row.storage_path,
      uploadedAt: row.uploaded_at,
    });
    map.set(row.agent_id, list);
  }
  return map;
}

// University lookup for the admin queue (migration 0036). University lister rows
// carry a university_id FK; the queue resolves it to the editorial record's
// name/slug/website — the slug links to /admin/universities/{slug}/edit and the
// website is the admin's outreach starting point. Service-role read (consistent
// with the rest of this admin surface); universities are public data anyway.
export interface AdminUniversityRef {
  name: string;
  slug: string;
  website: string;
}

export async function listUniversitiesForAdmin(
  universityIds: string[],
): Promise<Map<string, AdminUniversityRef>> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");
  const ids = universityIds.filter((id): id is string => !!id);
  if (ids.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("universities")
    .select("id, name, slug, website")
    .in("id", ids);
  if (error || !data) return new Map();

  const map = new Map<string, AdminUniversityRef>();
  for (const row of data as Array<{
    id: string;
    name: string;
    slug: string;
    website: string;
  }>) {
    map.set(row.id, { name: row.name, slug: row.slug, website: row.website });
  }
  return map;
}

// Per-agent consent count (used for the "terms ✓" chip in the admin queue).
export async function listAgentConsentCounts(
  agentIds: string[],
): Promise<Map<string, number>> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");
  if (agentIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_consents")
    .select("agent_id")
    .in("agent_id", agentIds)
    .eq("consent_type", "verified_agent_terms");
  if (error || !data) return new Map();

  const map = new Map<string, number>();
  for (const row of data as Array<{ agent_id: string }>) {
    map.set(row.agent_id, (map.get(row.agent_id) ?? 0) + 1);
  }
  return map;
}
