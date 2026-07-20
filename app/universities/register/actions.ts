"use server";

import { createActionClient } from "@/lib/supabase/server";
import { deriveUniqueSlug } from "@/lib/data/unique-slug";
import { getAllUniversities } from "@/lib/data/universities";
import { getDictionary } from "@/lib/i18n/server";

type ActionClient = Awaited<ReturnType<typeof createActionClient>>;

interface UniversityProfileFields {
  universityId: string;
  universityName: string;
  name: string;
  contactPersonName: string;
  contactPersonRole: string;
  phone: string;
  whatsapp: string;
  contactEmail: string;
  applicationNotes: string | null;
}

// Profile validation for a university application. Mirrors the agent gate order
// (app/agents/register/actions.ts): EVERYTHING here — field shapes, the
// university-exists check, and the duplicate-account RPC — runs BEFORE
// auth.signUp so a rejected application creates NO auth user (the orphan bug the
// agent flow closed in 0034). university_account_exists (0036) mirrors the
// partial-unique index predicate and is checked here, failing CLOSED on error.
async function validateUniversityProfile(
  formData: FormData,
  sb: ActionClient,
): Promise<{ error: string } | { fields: UniversityProfileFields }> {
  const universityId = String(formData.get("university_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const contactPersonName = String(formData.get("contact_person_name") ?? "").trim();
  const contactPersonRole = String(formData.get("contact_person_role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const notesRaw = String(formData.get("application_notes") ?? "").trim();
  const terms = formData.get("terms");

  const { errors: e, auth } = await getDictionary();

  if (
    !universityId ||
    !name ||
    !contactPersonName ||
    !contactPersonRole ||
    !phone ||
    !whatsapp ||
    !contactEmail
  ) {
    return { error: e.allFieldsRequired };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: e.validContactEmail };
  }
  if (!terms) {
    return { error: auth.mustAgreeTerms };
  }

  // The submitted university_id must be a live campus on Nook's list. Resolve the
  // display name here too (denormalized into agents.agency — see insert below).
  const universities = await getAllUniversities();
  const uni = universities.find((u) => u.id === universityId);
  if (!uni) {
    return { error: e.unknownUniversity };
  }

  // Duplicate-account gate. RPC error (network, missing migration) fails CLOSED:
  // a second live account per university must never slip through.
  const { data: taken, error: rpcErr } = await sb.rpc("university_account_exists", {
    p_university_id: universityId,
  });
  if (rpcErr) {
    console.error(`[university-register] university_account_exists: ${rpcErr.message}`);
    return { error: e.couldNotRegister };
  }
  if (taken) {
    return { error: e.universityAccountExists };
  }

  return {
    fields: {
      universityId,
      universityName: uni.name,
      name,
      contactPersonName,
      contactPersonRole,
      phone,
      whatsapp,
      contactEmail,
      applicationNotes: notesRaw || null,
    },
  };
}

// Insert the university's agents row. Columns come from the 0024 grant (user_id,
// slug, name, agency, phone, whatsapp, email) plus the 0036 grant (lister_type,
// university_id, contact_person_name, contact_person_role, application_notes).
// bovaep_licence is deliberately omitted — it stays null, which the 0036
// agents_university_no_licence_chk constraint requires for a university row.
// agency is denormalized to the university NAME so the sidebar/card/profile
// render correctly with zero component changes; university_id stays the source
// of truth for the badge.
async function insertUniversityRow(
  sb: ActionClient,
  userId: string,
  f: UniversityProfileFields,
): Promise<{ error?: string }> {
  const { errors: e } = await getDictionary();
  const slug = await deriveUniqueSlug(f.name, sb, "university");
  const { error: insertError } = await sb.from("agents").insert({
    user_id: userId,
    slug,
    name: f.name,
    agency: f.universityName,
    phone: f.phone,
    whatsapp: f.whatsapp,
    email: f.contactEmail,
    lister_type: "university",
    university_id: f.universityId,
    contact_person_name: f.contactPersonName,
    contact_person_role: f.contactPersonRole,
    application_notes: f.applicationNotes,
  });
  if (insertError) {
    console.error(
      `[university-register] agents insert failed for user=${userId}: ${insertError.message}`,
    );
    return { error: e.couldNotRegister };
  }
  return {};
}

export async function signUpUniversityAction(
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
  // All validation — including the duplicate-account check — runs BEFORE signUp.
  const validated = await validateUniversityProfile(formData, supabase);
  if ("error" in validated) return { error: validated.error };

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: validated.fields.name } },
  });
  if (signUpError) {
    return { error: signUpError.message };
  }

  // Same auto-confirm dependency as the agent flow: signUp returns an active
  // session, so the insert below runs as the authenticated user and satisfies
  // agents_insert_self_pending (user_id = auth.uid()). No session ⇒ hard-fail
  // honestly rather than orphan the auth user.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error(
      `[university-register] no session after signUp, auth auto-confirm may be OFF. ` +
        `Orphaned auth user email=${email}. Agents row NOT created.`,
    );
    return { error: e.registrationConfig };
  }

  const inserted = await insertUniversityRow(supabase, user.id, validated.fields);
  if (inserted.error) return { error: inserted.error };

  return undefined;
}
