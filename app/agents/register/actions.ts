"use server";

import { createActionClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

type ActionClient = Awaited<ReturnType<typeof createActionClient>>;

// Server-side slug from name (LOCK-4.3). Collision → append -2/-3 against the
// agents.slug UNIQUE constraint. Non-Latin fallback: if slugify yields < 3
// chars, use agent-{short-uuid}.
async function deriveUniqueSlug(name: string, sb: ActionClient): Promise<string> {
  let base = slugify(name);
  if (base.length < 3) base = `agent-${crypto.randomUUID().slice(0, 8)}`;
  let candidate = base;
  for (let n = 2; ; n++) {
    const { data } = await sb
      .from("agents")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`;
  }
}

export async function signUpAgentAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const agency = String(formData.get("agency") ?? "").trim();
  const bovaepLicence = String(formData.get("bovaep_licence") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const terms = formData.get("terms");

  if (!name || !email || !phone || !whatsapp || !agency || !bovaepLicence || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!terms) {
    return { error: "You must agree to the Terms of Service to continue." };
  }

  const supabase = await createActionClient();
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
      `[agent-register] no session after signUp — auth auto-confirm may be OFF. ` +
        `Orphaned auth user email=${email}. Agents row NOT created.`,
    );
    return {
      error:
        "Registration could not complete due to a server configuration issue. Try again later or contact support.",
    };
  }

  const slug = await deriveUniqueSlug(name, supabase);

  const { error: insertError } = await supabase.from("agents").insert({
    user_id: user.id,
    slug,
    name,
    agency,
    phone,
    whatsapp,
    email, // public contact == registration email for self-registered agents
    bovaep_licence: bovaepLicence,
    status: "pending", // explicit — required by the RLS with-check
    rating: 0.0,
    review_count: 0,
    response_time_mins: 60,
    languages: ["en"],
    years_active: 0,
    avatar_url: "/agent-placeholder.svg",
    // id, submitted_at default in the DB; bio stays null.
  });
  if (insertError) {
    console.error(
      `[agent-register] agents insert failed for user=${user.id} email=${email}: ${insertError.message}`,
    );
    return { error: "Could not complete registration. Try again." };
  }

  return undefined;
}
