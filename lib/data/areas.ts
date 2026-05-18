import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";
import { AREA_COLS, rowToArea, type AreaRow } from "@/lib/data/_row-mappers";

export async function getAllAreas(): Promise<Area[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("areas").select(AREA_COLS).order("name");
  if (error || !data) return [];
  return (data as AreaRow[]).map(rowToArea);
}

export async function getAreaBySlug(slug: string): Promise<Area | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("areas")
    .select(AREA_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToArea(data as AreaRow);
}

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
