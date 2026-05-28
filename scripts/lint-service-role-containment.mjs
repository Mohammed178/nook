// Phase 4a-2 — service-role containment guard (L-4a2.11).
// Fails (exit 1) if `@/lib/supabase/admin` is imported anywhere outside
// app/admin/. The service-role client bypasses RLS, so its import surface must
// stay confined to admin server actions.
//
// Run: npm run lint:service-role-containment
//
// Wraps a single `git grep` (PowerShell-portable, and inverts the exit code:
// git grep exits 0 when it finds matches, but a match here is a FAILURE).
// --untracked catches not-yet-committed leaks (and the rls-test S6 fixture).
// Scoped to *.ts / *.tsx only: the `@/…` path alias resolves solely in the
// Next/TS compilation, so .mjs scripts and .md docs can never be real importers —
// scoping this way also keeps prose mentions (LATE_CATCHES, this plan, the test
// harness's fixture string) from false-matching. Excludes app/admin/** (the only
// legitimate importer).

import { spawnSync } from "node:child_process";

const PATTERN = "@/lib/supabase/admin";
const args = [
  "grep",
  "--untracked",
  "-lF",
  PATTERN,
  "--",
  "*.ts",
  "*.tsx",
  ":!app/admin/**",
];

const res = spawnSync("git", args, { encoding: "utf8" });

// git grep exit codes: 0 = matches found, 1 = no matches, >1 = error.
if (res.status === 1) {
  console.log("service-role containment OK — no leaked imports.");
  process.exit(0);
}
if (res.status === 0) {
  console.error(
    `service-role containment FAILED — \`${PATTERN}\` imported outside app/admin/:`,
  );
  console.error(res.stdout.trim());
  process.exit(1);
}

console.error(`git grep errored (status ${res.status}): ${res.stderr}`);
process.exit(2);
