import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { University, UniversityRecord } from "@/lib/types";
import {
  UNIVERSITY_COLS,
  rowToUniversity,
  type UniversityRow,
} from "@/lib/data/_row-mappers";

// Projects DB records to the lean `University` shape the search/select client
// components expect, crucially remapping `id` → the slug. Those components use
// `university.id` as the URL `?university=` token and the stored profile
// `university_id` value, both of which are slugs by contract (the UUID primary
// key never reaches a URL or the profiles table). Display fields are unchanged.
export function toSearchUniversities(
  records: UniversityRecord[],
): University[] {
  return records.map((u) => ({
    id: u.slug,
    name: u.name,
    shortName: u.shortName,
    city: u.city,
    state: u.state,
    lat: u.lat,
    lng: u.lng,
    studentCount: u.studentCount,
    campusType: u.campusType,
  }));
}

// DB read surface for universities (migration 0022). Mirrors lib/data/areas.ts.
// The public RLS policy hides soft-deleted rows, so these helpers never see a
// hidden campus; the admin queue (app/admin/universities/_data.ts) uses the
// service-role client to see every row.

export async function getAllUniversities(): Promise<UniversityRecord[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("universities")
    .select(UNIVERSITY_COLS)
    .order("name");
  if (error || !data) return [];
  return (data as UniversityRow[]).map(rowToUniversity);
}

export async function getUniversityBySlug(
  slug: string,
): Promise<UniversityRecord | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("universities")
    .select(UNIVERSITY_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToUniversity(data as UniversityRow);
}
