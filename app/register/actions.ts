"use server";

import { createActionClient } from "@/lib/supabase/server";
import { UNIVERSITIES } from "@/lib/seed/universities";

const VALID_GENDERS = new Set(["female", "male", "mixed"]);
const VALID_UNIVERSITY_IDS = new Set(UNIVERSITIES.map((u) => u.id));

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

  if (!email || !password || !displayName) {
    return { error: "Email, password, and display name are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!terms) {
    return { error: "You must agree to the Terms of Service to continue." };
  }

  // Validate against seed list before sending. No FK in DB; this is the
  // gate (see migration 0003 for rationale).
  if (universityIdRaw && !VALID_UNIVERSITY_IDS.has(universityIdRaw)) {
    return { error: "Pick a university from the list." };
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
