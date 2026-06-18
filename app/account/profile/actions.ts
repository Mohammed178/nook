"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { getUniversityBySlug } from "@/lib/data/universities";
import { getDictionary } from "@/lib/i18n/server";

const VALID_GENDERS = new Set(["female", "male", "mixed"]);

export async function updateProfileAction(
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const universityIdRaw = String(formData.get("university_id") ?? "").trim();
  const genderRaw = String(formData.get("gender_preference") ?? "").trim();

  const dict = await getDictionary();
  const a = dict.account;

  if (!displayName) {
    return { error: a.displayNameRequired };
  }
  if (universityIdRaw && !(await getUniversityBySlug(universityIdRaw))) {
    return { error: a.pickUniversity };
  }

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: a.notSignedIn };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      phone: phone || null,
      country: country || null,
      university_id: universityIdRaw || null,
      gender_preference: VALID_GENDERS.has(genderRaw) ? genderRaw : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}
