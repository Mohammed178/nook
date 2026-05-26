// Shared slug algorithm. Single source of truth for both the seed pipeline
// (scripts/seed-3ba.mjs, via --experimental-strip-types) and the agent register
// action (app/agents/register/actions.ts). LOCK-4.3.
//
// Byte-for-byte the algorithm previously inlined in scripts/seed-3ba.mjs:
//   NFKD normalize -> strip combining marks -> lowercase -> non-alphanumeric to
//   hyphen -> trim leading/trailing hyphens.
//
// Collision handling (append -2/-3) and the <3-char non-Latin fallback live at
// the call sites: the seed dedupes in-memory across the batch, the register
// action dedupes against the agents.slug UNIQUE constraint.
export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
