import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import type { UniversityRecord } from "@/lib/types";
import {
  UNIVERSITY_COLS,
  rowToUniversity,
  type UniversityRow,
} from "@/lib/data/_row-mappers";

// Admin reads for /admin/universities. Uses the SERVICE-ROLE client so the
// queue sees soft-hidden rows too (the public RLS policy hides deleted_at IS NOT
// NULL). The service-role import is allowed here because this file lives under
// app/admin/ (the location the containment lint permits). Each function
// re-asserts isAdmin before the RLS-bypassing client, mirroring
// app/admin/agents/_data.ts — no service-role use without an in-function gate.

export async function listUniversitiesAdmin(): Promise<UniversityRecord[]> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("universities")
    .select(UNIVERSITY_COLS)
    .order("name");
  if (error || !data) return [];
  return (data as UniversityRow[]).map(rowToUniversity);
}

export async function getUniversityAdmin(
  slug: string,
): Promise<UniversityRecord | null> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("universities")
    .select(UNIVERSITY_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToUniversity(data as UniversityRow);
}
