import { test as teardown } from "@playwright/test";
import { adminClient } from "./helpers/supabase-admin";
import { readSeed, removeSeedArtifacts, seedExists } from "./helpers/seed";

// Deterministic cleanup of everything global.setup.ts (and the specs) created.
// Order matters: listings/favourites reference agents/users, so children go
// first. Each step is best-effort — a failure is logged, not fatal, so one
// stuck row doesn't strand the rest.

teardown("delete ephemeral users and seeded rows", async () => {
  if (!seedExists()) return;
  const seed = readSeed();
  const admin = adminClient();

  async function attempt(
    label: string,
    fn: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    try {
      const { error } = await fn();
      if (error) console.warn(`teardown ${label}: ${error.message}`);
    } catch (e) {
      console.warn(`teardown ${label}: ${(e as Error).message}`);
    }
  }

  if (seed.agentIds.length > 0) {
    // Agent specs may have created listings; find them to clear photo rows too.
    const { data: listings } = await admin
      .from("listings")
      .select("id")
      .in("agent_id", seed.agentIds);
    const listingIds = (listings ?? []).map((l) => l.id);
    if (listingIds.length > 0) {
      await attempt("listing_photos", () =>
        admin.from("listing_photos").delete().in("listing_id", listingIds),
      );
      await attempt("favourites (of seeded listings)", () =>
        admin.from("favourites").delete().in("listing_id", listingIds),
      );
      await attempt("listings", () =>
        admin.from("listings").delete().in("id", listingIds),
      );
    }
  }

  if (seed.userIds.length > 0) {
    await attempt("favourites (by seeded users)", () =>
      admin.from("favourites").delete().in("user_id", seed.userIds),
    );
    await attempt("recent_views", () =>
      admin.from("recent_views").delete().in("user_id", seed.userIds),
    );
    await attempt("saved_searches", () =>
      admin.from("saved_searches").delete().in("user_id", seed.userIds),
    );
    await attempt("agents", () =>
      admin.from("agents").delete().in("id", seed.agentIds),
    );
    for (const uid of seed.userIds) {
      try {
        const { error } = await admin.auth.admin.deleteUser(uid);
        if (error) console.warn(`teardown deleteUser ${uid}: ${error.message}`);
      } catch (e) {
        console.warn(`teardown deleteUser ${uid}: ${(e as Error).message}`);
      }
    }
  }

  removeSeedArtifacts();
});
