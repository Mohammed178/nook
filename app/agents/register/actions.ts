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

export async function signUpAgentAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const agency = String(formData.get("agency") ?? "").trim();
  const bovaepLicence = String(formData.get("bovaep_licence") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const terms = formData.get("terms");

  const { errors: e, auth } = await getDictionary();

  if (!name || !email || !contactEmail || !phone || !whatsapp || !agency || !bovaepLicence || !password) {
    return { error: e.allFieldsRequired };
  }
  if (password.length < 8) {
    return { error: auth.passwordMin };
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
  // F3, defense-in-depth licence format check. Length + charset that admits the
  // BOVAEP "E(n)NNNN" estate-agent number (parentheses required, the seed agents
  // use E(3)2148 etc.) plus other class prefixes. Deliberately not pinned to a
  // single E(n) shape: the unique index (0025) and the manual admin registry check
  // (LOCK-4.6) are the real integrity gates; format is only a sanity bound.
  if (!/^[A-Za-z0-9()/\- ]{4,40}$/.test(bovaepLicence)) {
    return { error: e.validBovaep };
  }

  const supabase = await createActionClient();

  // 0034: duplicate-licence pre-check BEFORE signUp, via the SECURITY DEFINER
  // licence_exists RPC (granted to anon; sees every status, unlike the RLS
  // read). Without this, a duplicate licence failed only at the agents INSERT
  // below — after the auth user was already created — leaving an orphaned,
  // signed-in account with no agents row and no recovery path. A concurrent
  // race can still slip past this check; the 0025 partial UNIQUE index remains
  // the hard gate and the INSERT error path below still handles it.
  const { data: licenceTaken, error: licenceErr } = await supabase.rpc(
    "licence_exists",
    { p_licence: bovaepLicence },
  );
  if (licenceErr) {
    console.error(`[agent-register] licence_exists RPC failed: ${licenceErr.message}`);
    return { error: e.couldNotRegister };
  }
  if (licenceTaken) {
    return { error: e.licenceAlreadyRegistered };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    // display_name flows to the vestigial profiles row via handle_new_user()
    // (LOCK-4.24). The agents row below is the business identity.
    options: { data: { display_name: name } },
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

  const slug = await deriveUniqueSlug(name, supabase);

  // F1, send ONLY the 8 columns a registrant legitimately sets. The column
  // INSERT grant (0024) revokes the broad table grant and permits exactly these;
  // status / rating / review_count / response_time_mins / languages / years_active
  // / avatar_url are omitted on purpose and fall to their DB DEFAULTs (0023 /
  // 0010). Naming any of them here would be rejected with 42501 under the column
  // grant, the omission is load-bearing, not cosmetic. id / submitted_at /
  // created_at / updated_at also default in the DB; bio / verified_at stay null.
  const { error: insertError } = await supabase.from("agents").insert({
    user_id: user.id,
    slug,
    name,
    agency,
    phone,
    whatsapp,
    // LC-26, `agents.email` holds the PUBLIC contact, not the login email. It is
    // written from the separate contact_email field, decoupled from the signUp
    // (auth) email above. Column rename agents.email → contact_email is deferred
    // (LATE_CATCHES); until then the column name is a temporary misnomer.
    email: contactEmail,
    bovaep_licence: bovaepLicence,
  });
  if (insertError) {
    console.error(
      `[agent-register] agents insert failed for user=${user.id} email=${email}: ${insertError.message}`,
    );
    return { error: e.couldNotRegister };
  }

  return undefined;
}
