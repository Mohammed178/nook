// Canonical list of Malaysian states + federal territories, in BM spelling.
// Mirrors the CHECK constraint on agents.practising_state (migration 0033 §1)
// and the literal allow-list in save_licence_step() (§6.1). Single source of
// truth so the form, the DB, and any future filter agree byte-for-byte.
//
// Why BM canonical (not "Penang"): the field tells the reviewing admin which
// LPPEH register dropdown to use; LPPEH uses BM names. Exact LPPEH-string match
// is not required — the admin picks from LPPEH's dropdown themselves.
export const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
] as const;

export type MalaysianState = (typeof MALAYSIAN_STATES)[number];
