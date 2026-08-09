import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";
import { AREA_COLS, rowToArea, type AreaRow } from "@/lib/data/_row-mappers";

// unstable_cache: areas are seeded reference data, effectively static at
// runtime. Cache the full set across requests via the cookie-free public
// client. 300s TTL; no app-level write path, so a TTL refresh is enough.
export const getAllAreas = unstable_cache(
  async (): Promise<Area[]> => {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("areas")
      .select(AREA_COLS)
      .order("name");
    if (error || !data) return [];
    return (data as AreaRow[]).map(rowToArea);
  },
  ["all-areas"],
  { tags: ["areas"], revalidate: 300 },
);

// cache(): generateMetadata and the page body both fetch the same slug, so the
// cookie client would run two identical queries per request. Per-request only,
// same pattern as getLocale / getCurrentUser.
export const getAreaBySlug = cache(async (slug: string): Promise<Area | null> => {
  const sb = await createClient();
  const { data, error } = await sb
    .from("areas")
    .select(AREA_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArea(data as AreaRow);
});

export async function getAreaByUuid(uuid: string): Promise<Area | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("areas")
    .select(AREA_COLS)
    .eq("id", uuid)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArea(data as AreaRow);
}
