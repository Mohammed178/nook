import { createClient } from "@/lib/supabase/server";

/**
 * Server-only. Returns IDs of listings the current user has favourited.
 * Empty array when signed-out or query fails.
 */
export async function getFavouriteIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favourites")
    .select("listing_id")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((row) => row.listing_id as string);
}
