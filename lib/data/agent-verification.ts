import "server-only";
import { createClient } from "@/lib/supabase/server";

// Owner reads for agent-verification surfaces (the /agents/verify stepper +
// /agents/pending progress chips). All reads go through the RLS client and rely
// on the agent_documents / agent_consents owner-SELECT policies from 0033 (which
// resolve the calling agent via user_id, so PENDING agents can read their own
// rows during onboarding — see migration §2/§4 and delta D4 in the build prompt).
//
// Admin queue document listing lives in app/admin/agents/_data.ts (service-role
// path). The service-role client may not be imported into this file — the
// containment lint enforces it (scripts/lint-service-role-containment.mjs).

export type AgentDocType = "ren_cert" | "employment_letter";

export interface AgentDocument {
  id: string;
  docType: AgentDocType;
  storagePath: string;
  uploadedAt: string;
}

export interface AgentConsent {
  id: string;
  consentType: "verified_agent_terms" | "privacy";
  documentVersion: string;
  acceptedAt: string;
}

interface DocumentRow {
  id: string;
  doc_type: AgentDocType;
  storage_path: string;
  uploaded_at: string;
}

interface ConsentRow {
  id: string;
  consent_type: "verified_agent_terms" | "privacy";
  document_version: string;
  accepted_at: string;
}

export async function getAgentDocumentsForCurrentUser(): Promise<AgentDocument[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agent_documents")
    .select("id, doc_type, storage_path, uploaded_at")
    .order("uploaded_at", { ascending: false });
  if (error || !data) return [];
  return (data as DocumentRow[]).map((r) => ({
    id: r.id,
    docType: r.doc_type,
    storagePath: r.storage_path,
    uploadedAt: r.uploaded_at,
  }));
}

export async function getAgentConsentsForCurrentUser(): Promise<AgentConsent[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("agent_consents")
    .select("id, consent_type, document_version, accepted_at");
  if (error || !data) return [];
  return (data as ConsentRow[]).map((r) => ({
    id: r.id,
    consentType: r.consent_type,
    documentVersion: r.document_version,
    acceptedAt: r.accepted_at,
  }));
}

// Current Verified-Agent terms document version. Bumped when legal copy
// changes; the version is captured on every consent INSERT so we can prove
// which version a given agent accepted.
export const VERIFIED_AGENT_TERMS_VERSION = "2026-06-30-v1";
