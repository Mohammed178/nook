"use server";

import { createActionClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { getDictionary } from "@/lib/i18n/server";

type ActionClient = Awaited<ReturnType<typeof createActionClient>>;

// Server-side slug from name (LOCK-4.3). Collision → append -2/-3 against the
// agents.slug UNIQUE constraint. Non-Latin fallback: if slugify yields < 3
// chars, use agent-{short-uuid}.
//
// Phase H2: collision check goes through the `slug_exists` security-definer RPC,
// not a direct `.from("agents")` read. Under approved-only public scoping the RLS
// read client cannot see pending/rejected/soft-deleted slugs, so a direct read
// would miss a collision and the INSERT would then fail on the UNIQUE constraint
// (23505). slug_exists checks ALL rows regardless of status/deletion.
async function deriveUniqueSlug(name: string, sb: ActionClient): Promise<string> {
  let base = slugify(name);
  if (base.length < 3) base = `agent-${crypto.randomUUID().slice(0, 8)}`;
  let candidate = base;
  for (let n = 2; ; n++) {
    const { data: exists } = await sb.rpc("slug_exists", { p_slug: candidate });
    if (!exists) return candidate;
    candidate = `${base}-${n}`;
  }
}

// F3, defense-in-depth licence format check. Length + charset that admits the
// BOVAEP "E(n)NNNN" estate-agent number (parentheses required, the seed agents
// use E(3)2148 etc.) plus other class prefixes. Deliberately not pinned to a
// single E(n) shape: the unique index (0025) and the manual admin registry check
// (LOCK-4.6) are the real integrity gates; format is only a sanity bound.
const BOVAEP_RE = /^[A-Za-z0-9()/\- ]{4,40}$/;

interface AgentProfileFields {
  name: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  agency: string;
  bovaepLicence: string;
}

// Profile-field validation shared by fresh registration and the orphan-recovery
// "complete your profile" path. Gate order matters: everything here (including
// the licence_exists duplicate check) runs BEFORE auth.signUp so a rejected
// registration creates NO auth user. Previously the duplicate licence was only
// caught by the 0025 UNIQUE at INSERT time — after signUp — which orphaned the
// auth account (no agents row, logs in as a "student"). licence_exists (0034,
// security definer, anon-callable) mirrors the 0025 partial-unique predicate.
//
// Race window between check and INSERT stays theoretically open; the 0025
// constraint remains the hard backstop and that path falls to the generic
// couldNotRegister error.
async function validateAgentProfile(
  formData: FormData,
  sb: ActionClient,
): Promise<{ error: string } | { fields: AgentProfileFields }> {
  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const agency = String(formData.get("agency") ?? "").trim();
  const bovaepLicence = String(formData.get("bovaep_licence") ?? "").trim();
  const terms = formData.get("terms");

  const { errors: e, auth } = await getDictionary();

  if (!name || !contactEmail || !phone || !whatsapp || !agency || !bovaepLicence) {
    return { error: e.allFieldsRequired };
  }
  // LC-26, the public contact email is a SEPARATE field from the login email and
  // is shown publicly (agents_public). Validate its shape server-side; the form's
  // type="email" is client-only and non-authoritative. Simple email-shape bound,
  // not the bovaep charset.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: e.validContactEmail };
  }
  if (!terms) {
    return { error: auth.mustAgreeTerms };
  }
  if (!BOVAEP_RE.test(bovaepLicence)) {
    return { error: e.validBovaep };
  }
  // Duplicate licence gate. RPC error (network, missing migration) fails CLOSED:
  // registering a duplicate-licence account orphans it, so an unverifiable
  // licence must not pass.
  const { data: licenceTaken, error: licenceErr } = await sb.rpc("licence_exists", {
    p_licence: bovaepLicence,
  });
  if (licenceErr) {
    console.error(`[agent-register] licence_exists: ${licenceErr.message}`);
    return { error: e.couldNotRegister };
  }
  if (licenceTaken) {
    return { error: e.licenceAlreadyRegistered };
  }

  return { fields: { name, contactEmail, phone, whatsapp, agency, bovaepLicence } };
}

// Insert the agents row for the given (already authenticated) user. F1, send
// ONLY the 8 columns a registrant legitimately sets. The column INSERT grant
// (0024) revokes the broad table grant and permits exactly these; status /
// rating / review_count / response_time_mins / languages / years_active /
// avatar_url are omitted on purpose and fall to their DB DEFAULTs (0023 / 0010).
// Naming any of them here would be rejected with 42501 under the column grant,
// the omission is load-bearing, not cosmetic. id / submitted_at / created_at /
// updated_at also default in the DB; bio / verified_at stay null.
async function insertAgentRow(
  sb: ActionClient,
  userId: string,
  f: AgentProfileFields,
): Promise<{ error?: string }> {
  const { errors: e } = await getDictionary();
  const slug = await deriveUniqueSlug(f.name, sb);
  const { error: insertError } = await sb.from("agents").insert({
    user_id: userId,
    slug,
    name: f.name,
    agency: f.agency,
    phone: f.phone,
    whatsapp: f.whatsapp,
    // LC-26, `agents.email` holds the PUBLIC contact, not the login email. It is
    // written from the separate contact_email field, decoupled from the signUp
    // (auth) email. Column rename agents.email → contact_email is deferred
    // (LATE_CATCHES); until then the column name is a temporary misnomer.
    email: f.contactEmail,
    bovaep_licence: f.bovaepLicence,
  });
  if (insertError) {
    console.error(
      `[agent-register] agents insert failed for user=${userId}: ${insertError.message}`,
    );
    return { error: e.couldNotRegister };
  }
  return {};
}

export async function signUpAgentAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { errors: e, auth } = await getDictionary();
  if (!email || !password) {
    return { error: e.allFieldsRequired };
  }
  if (password.length < 8) {
    return { error: auth.passwordMin };
  }

  const supabase = await createActionClient();
  // All profile validation — including the licence duplicate check — runs
  // BEFORE signUp: if either the format or the uniqueness condition fails,
  // nobody gets registered.
  const validated = await validateAgentProfile(formData, supabase);
  if ("error" in validated) return { error: validated.error };

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    // display_name flows to the vestigial profiles row via handle_new_user()
    // (LOCK-4.24). The agents row below is the business identity.
    options: { data: { display_name: validated.fields.name } },
  });
  if (signUpError) {
    return { error: signUpError.message };
  }

  // DEPENDENCY: assumes Supabase auth auto-confirm is ON (verified in the
  // dashboard), same as the student /register flow. signUp then returns an
  // active session, so the agents insert below runs as the authenticated user
  // and satisfies the agents_insert_self_pending RLS policy (user_id =
  // auth.uid()). If auto-confirm is ever flipped OFF, getUser() returns no
  // session here: there is no resumption flow, so we hard-fail honestly rather
  // than orphan the auth user silently, and log the case server-side so it
  // surfaces in production.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error(
      `[agent-register] no session after signUp, auth auto-confirm may be OFF. ` +
        `Orphaned auth user email=${email}. Agents row NOT created.`,
    );
    return { error: e.registrationConfig };
  }

  const inserted = await insertAgentRow(supabase, user.id, validated.fields);
  if (inserted.error) return { error: inserted.error };

  return undefined;
}

// Orphan-recovery path: an authenticated user whose agents INSERT failed after
// signUp (pre-0034 duplicate licence, or any historical partial registration)
// has a login but no agents row and gets routed as a student. /agents/register
// renders the "complete your profile" variant for them; this action creates
// just the agents row. The agents_insert_self_pending RLS policy (user_id =
// auth.uid()) plus the user_id UNIQUE make it safe: a user who already has an
// agents row falls to the constraint and gets the generic error.
export async function completeAgentProfileAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const { errors: e } = await getDictionary();
  const supabase = await createActionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: e.notSignedIn };
  }

  const validated = await validateAgentProfile(formData, supabase);
  if ("error" in validated) return { error: validated.error };

  const inserted = await insertAgentRow(supabase, user.id, validated.fields);
  if (inserted.error) return { error: inserted.error };

  return undefined;
}
