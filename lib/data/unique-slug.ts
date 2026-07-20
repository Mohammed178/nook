import { slugify } from "@/lib/slugify";
import type { createActionClient } from "@/lib/supabase/server";

// The action client type, structurally all this helper needs is `.rpc`.
type SlugClient = Awaited<ReturnType<typeof createActionClient>>;

// Server-side unique slug from a display name (LOCK-4.3). Collision → append
// -2/-3 against the agents.slug UNIQUE constraint. Non-Latin fallback: if
// slugify yields < 3 chars, use {prefix}-{short-uuid}.
//
// Collision check goes through the `slug_exists` security-definer RPC, not a
// direct `.from("agents")` read: under approved-only public RLS the read client
// cannot see pending/rejected/soft-deleted slugs, so a direct read would miss a
// collision and the INSERT would then fail on the UNIQUE (23505). slug_exists
// checks ALL rows regardless of status/deletion.
//
// Extracted from app/agents/register/actions.ts (was module-private in a
// "use server" file, so it could not be imported) so the university register
// action (migration 0036) reuses the exact same derivation.
export async function deriveUniqueSlug(
  name: string,
  sb: SlugClient,
  prefix = "agent",
): Promise<string> {
  let base = slugify(name);
  if (base.length < 3) base = `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  let candidate = base;
  for (let n = 2; ; n++) {
    const { data: exists } = await sb.rpc("slug_exists", { p_slug: candidate });
    if (!exists) return candidate;
    candidate = `${base}-${n}`;
  }
}
