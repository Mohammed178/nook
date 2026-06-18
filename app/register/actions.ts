"use server";

import { createActionClient } from "@/lib/supabase/server";
import { getUniversityBySlug } from "@/lib/data/universities";
import { getDictionary } from "@/lib/i18n/server";

const VALID_GENDERS = new Set(["female", "male", "mixed"]);

export async function signUpAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const universityIdRaw = String(formData.get("university_id") ?? "").trim();
  const genderRaw = String(formData.get("gender_preference") ?? "").trim();
  const terms = formData.get("terms");

  const t = (await getDictionary()).auth;

  if (!email || !password || !displayName) {
    return { error: t.emailPasswordNameRequired };
  }
  if (password.length < 8) {
    return { error: t.passwordMin };
  }
  if (!terms) {
    return { error: t.mustAgreeTerms };
  }

  // Validate the slug against the live universities table (0022) before sending.
  // No FK in DB; this is the gate (see migration 0003 for rationale). The public
  // RLS read only returns live (non-deleted) campuses, so a hidden campus is
  // correctly rejected.
  if (universityIdRaw && !(await getUniversityBySlug(universityIdRaw))) {
    return { error: t.pickUniversity };
  }
  const universityId = universityIdRaw || null;
  const genderPreference = VALID_GENDERS.has(genderRaw) ? genderRaw : null;

  const supabase = await createActionClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        phone: phone || null,
        gender_preference: genderPreference,
        university_id: universityId,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }
  return undefined;
}
