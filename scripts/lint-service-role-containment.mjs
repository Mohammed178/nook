// Phase 4a-2 / H1, service-role containment guard (L-4a2.11).
// Fails (exit 1) if the service-role admin client leaks outside app/admin/.
// The service-role client bypasses RLS, so its import surface must stay
// confined to admin server actions.
//
// Run: npm run lint:service-role-containment
// Chained into `npm run lint` (H1). Not CI-gated yet, see LATE_CATCHES:
// "Containment lint now in `npm run lint` but not CI-gated, promote to a CI
// gate when CI lands."
//
// Two independent git-grep patterns (H1, the old single alias-grep missed
// relative-path imports):
//   Pattern A, path-suffix `lib/supabase/admin`: catches the `@/lib/supabase/admin`
//     alias AND deep-relative imports (`../../lib/supabase/admin`).
//   Pattern B, symbol `createAdminClient`: catches a sibling-relative import
//     (`./admin` from inside lib/supabase/) that A's substring would miss.
// Fail if EITHER matches.
//
// Both scoped to *.ts / *.tsx only: the `@/…` alias resolves solely in the
// Next/TS compilation, so .mjs scripts and .md docs can never be real importers,
// scoping this way also keeps prose mentions out (no false-match on this file's
// own prose, docs, or the rls-test fixture). Both exclude:
//   :!app/admin/**, admin server actions (original importer surface)
//   :!app/account/delete/actions.ts, self-service account deletion (exact file)
//   :!lib/supabase/admin.ts, the definition/export site itself
// Residual: a *.ts comment literally containing `createAdminClient` would trip
// Pattern B. Acceptable; documented here.

import { spawnSync } from "node:child_process";

const PATHS = [
  "*.ts",
  "*.tsx",
  ":!app/admin/**",
  ":!lib/supabase/admin.ts",
  // Self-service account deletion (0035): needs auth.admin.deleteUser plus
  // hard deletes on tables with no owner UPDATE/DELETE policies (agents 0010,
  // listings 0014). Exact-file allowlist entry, NOT a prefix — the rest of
  // app/account/** stays contained.
  ":!app/account/delete/actions.ts",
];

const PATTERNS = [
  { id: "A", label: "path-suffix `lib/supabase/admin`", term: "lib/supabase/admin" },
  { id: "B", label: "symbol `createAdminClient`", term: "createAdminClient" },
];

function runGrep(term) {
  // git grep exit codes: 0 = matches found, 1 = no matches, >1 = error.
  return spawnSync("git", ["grep", "--untracked", "-lF", term, "--", ...PATHS], {
    encoding: "utf8",
  });
}

let failed = false;
for (const { id, label, term } of PATTERNS) {
  const res = runGrep(term);
  if (res.status === 1) {
    console.log(`Pattern ${id} (${label}) OK, no leaked imports.`);
    continue;
  }
  if (res.status === 0) {
    failed = true;
    console.error(
      `service-role containment FAILED, Pattern ${id} (${label}) matched outside app/admin/:`,
    );
    console.error(res.stdout.trim());
    continue;
  }
  console.error(`git grep errored on Pattern ${id} (status ${res.status}): ${res.stderr}`);
  process.exit(2);
}

if (failed) process.exit(1);
console.log("service-role containment OK, no leaked imports.");
process.exit(0);
