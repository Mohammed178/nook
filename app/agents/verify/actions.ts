"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { generateOtpCode, sha256Hex } from "@/lib/otp/hash";
import { getOtpProvider } from "@/lib/otp/provider";
import { VERIFIED_AGENT_TERMS_VERSION } from "@/lib/data/agent-verification";
import { MALAYSIAN_STATES } from "@/lib/seed/malaysian-states";

// OTP TTL — 5 minutes. Mirrors verify_phone_otp's `expires_at <= now()` check.
const OTP_TTL_MS = 5 * 60_000;

// BOVAEP licence shape, same charset as the register action (F3 in
// app/agents/register/actions.ts). The DB partial UNIQUE (0025) + the manual
// LPPEH-registry check by the admin are the real integrity gates; this is a
// sanity bound to keep obviously bad input out of the row.
const BOVAEP_RE = /^[A-Za-z0-9()/\- ]{4,40}$/;

// Step 1 — save licence_type + practising_state (+ optional bovaep_licence
// re-edit). Calls save_licence_step (RPC, security definer) because there is
// no agents UPDATE policy for authenticated; the column-INSERT grant approach
// would never fire (delta D1 in the build prompt).
export async function saveLicenceStepAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const licenceType = String(formData.get("licence_type") ?? "").trim();
  const practisingState = String(formData.get("practising_state") ?? "").trim();
  const rawBovaep = String(formData.get("bovaep_licence") ?? "").trim();
  const bovaepLicence = rawBovaep.length > 0 ? rawBovaep : null;

  const { errors: e, agentVerify: t } = await getDictionary();

  if (!["REN", "REA", "PEA"].includes(licenceType)) {
    return { error: t.errLicenceType };
  }
  if (!MALAYSIAN_STATES.includes(practisingState as (typeof MALAYSIAN_STATES)[number])) {
    return { error: t.errPractisingState };
  }
  if (bovaepLicence && !BOVAEP_RE.test(bovaepLicence)) {
    return { error: e.validBovaep };
  }

  const supabase = await createActionClient();
  const { error } = await supabase.rpc("save_licence_step", {
    p_licence_type: licenceType,
    p_practising_state: practisingState,
    p_bovaep_licence: bovaepLicence,
  });
  if (error) {
    console.error(`[agent-verify] save_licence_step: ${error.message}`);
    return { error: t.errCouldNotSaveLicence };
  }
  revalidatePath("/agents/verify");
  revalidatePath("/agents/pending");
  return undefined;
}

// Step 2 — record an already-uploaded storage object as an agent_documents row.
// The client uploads directly to the agent-documents bucket (owner-INSERT
// storage policy gates it), then calls this action which goes through the
// security-definer RPC so a PENDING agent can write the table row too.
export async function recordAgentDocumentAction(
  docType: string,
  storagePath: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { agentVerify: t } = await getDictionary();
  if (!["ren_cert", "employment_letter"].includes(docType)) {
    return { ok: false, error: t.errDocType };
  }
  if (!storagePath || storagePath.length === 0) {
    return { ok: false, error: t.errDocPath };
  }
  const supabase = await createActionClient();
  const { data, error } = await supabase.rpc("insert_agent_document_self", {
    p_doc_type: docType,
    p_storage_path: storagePath,
  });
  if (error || !data) {
    console.error(
      `[agent-verify] insert_agent_document_self: ${error?.message ?? "no id"}`,
    );
    return { ok: false, error: t.errCouldNotRecordDoc };
  }
  revalidatePath("/agents/verify");
  revalidatePath("/agents/pending");
  return { ok: true, id: String(data) };
}

// Step 3a — generate code in the ROUTE, hash, hand the hash + expiry to
// request_phone_otp, then deliver the plaintext code via the OtpProvider.
// The plaintext NEVER leaves this scope; only the SHA-256 hex hash is persisted.
export async function requestPhoneOtpAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const phone = String(formData.get("phone") ?? "").trim();
  const { agentVerify: t } = await getDictionary();
  if (phone.length < 8) return { ok: false, error: t.errPhoneShape };

  const code = generateOtpCode();
  const codeHash = sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const supabase = await createActionClient();
  const { error } = await supabase.rpc("request_phone_otp", {
    p_phone: phone,
    p_code_hash: codeHash,
    p_expires_at: expiresAt,
  });
  if (error) {
    console.error(`[agent-verify] request_phone_otp: ${error.message}`);
    return { ok: false, error: t.errCouldNotSendOtp };
  }
  const send = await getOtpProvider().sendOtp({ phone, code });
  if (!send.ok) {
    console.error(`[agent-verify] otp.sendOtp: ${send.reason}`);
    return { ok: false, error: t.errCouldNotSendOtp };
  }
  return { ok: true };
}

// Step 3b — verify the entered code via verify_phone_otp. RPC returns boolean:
// true on match (flips agents.phone_verified=true); false on miss / expired /
// locked out. The action never sees the stored hash.
export async function verifyPhoneOtpAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  const { agentVerify: t } = await getDictionary();
  if (!/^\d{6}$/.test(code)) return { ok: false, error: t.errCodeShape };

  const supabase = await createActionClient();
  const { data, error } = await supabase.rpc("verify_phone_otp", { p_code: code });
  if (error) {
    console.error(`[agent-verify] verify_phone_otp: ${error.message}`);
    return { ok: false, error: t.errCouldNotVerifyOtp };
  }
  if (data !== true) return { ok: false, error: t.errOtpMismatch };
  revalidatePath("/agents/verify");
  revalidatePath("/agents/pending");
  return { ok: true };
}

// Step 4 — append-only consent log. The RLS policy gates the insert via the
// agent_id subquery (user_id = auth.uid()), so a forged agent_id is rejected.
// We capture the User-Agent header for the audit trail (best effort; null if
// the request doesn't carry one).
export async function recordTermsConsentAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { agentVerify: t } = await getDictionary();
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t.errNoSession };
  const { data: agentRow, error: agentErr } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (agentErr || !agentRow) return { ok: false, error: t.errNoAgentRow };
  const ua = (await headers()).get("user-agent") ?? null;
  const { error } = await supabase.from("agent_consents").insert({
    agent_id: agentRow.id,
    consent_type: "verified_agent_terms",
    document_version: VERIFIED_AGENT_TERMS_VERSION,
    user_agent: ua,
  });
  if (error) {
    console.error(`[agent-verify] insert consent: ${error.message}`);
    return { ok: false, error: t.errCouldNotRecordConsent };
  }
  revalidatePath("/agents/verify");
  revalidatePath("/agents/pending");
  return { ok: true };
}

// Step 5 — final submit. RPC raises NK101..NK106 with `using errcode = …` when
// a precondition is missing; the action maps those to per-step UX copy. Any
// other error is the generic fallback.
export async function submitVerificationAction(): Promise<
  { ok: true } | { ok: false; error: string; code?: string }
> {
  const { agentVerify: t } = await getDictionary();
  const supabase = await createActionClient();
  const { error } = await supabase.rpc("submit_verification");
  if (error) {
    // PostgREST surfaces the Postgres SQLSTATE on .code, message on .message.
    const code = error.code ?? "";
    const map: Record<string, string> = {
      NK101: t.errNeedLicenceType,
      NK102: t.errNeedPractisingState,
      NK103: t.errNeedBovaep,
      NK104: t.errNeedPhoneVerified,
      NK105: t.errNeedDocument,
      NK106: t.errNeedTerms,
    };
    const friendly = map[code] ?? t.errCouldNotSubmit;
    console.error(`[agent-verify] submit_verification ${code}: ${error.message}`);
    return { ok: false, error: friendly, code };
  }
  revalidatePath("/agents/verify");
  revalidatePath("/agents/pending");
  return { ok: true };
}
