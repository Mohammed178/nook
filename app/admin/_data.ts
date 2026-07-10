import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

// Overview counts for the /admin landing. Service-role client so the figures see
// pending agents and soft-hidden universities (both invisible to the public RLS
// read path). The service-role import is permitted here because this file lives
// under app/admin/ (the containment lint's allowed location); it re-asserts
// isAdmin before the RLS-bypassing client, mirroring app/admin/agents/_data.ts
// and app/admin/universities/_data.ts. All reads are head-only counts (no row
// payloads), run in parallel.
export interface AdminOverviewCounts {
  pendingAgents: number;
  liveUniversities: number;
  hiddenUniversities: number;
}

export async function getAdminOverviewCounts(): Promise<AdminOverviewCounts> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");

  const admin = createAdminClient();
  const [pending, liveUni, hiddenUni] = await Promise.all([
    admin
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    admin
      .from("universities")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    admin
      .from("universities")
      .select("id", { count: "exact", head: true })
      .not("deleted_at", "is", null),
  ]);

  return {
    pendingAgents: pending.count ?? 0,
    liveUniversities: liveUni.count ?? 0,
    hiddenUniversities: hiddenUni.count ?? 0,
  };
}
