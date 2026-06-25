"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { haversineKm } from "@/lib/distance";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

// Two campuses closer than this are treated as the same physical location. A
// university footprint is large, but distinct campuses in one city are normally
// >200 m apart, so this catches "same place, slightly different map pin" without
// false-flagging genuine neighbours.
const DUPLICATE_RADIUS_KM = 0.2;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UniActionResult {
  error?: string;
  ok?: true;
  slug?: string;
}

// Caller must be an admin. Defence-in-depth: re-assert with the RLS read client
// BEFORE any service-role write, exactly like the agent decision path
// (app/admin/agents/actions.ts:37). Route gating (middleware + layout) is the
// primary gate; this throws even if those are bypassed.
async function assertAdmin(): Promise<void> {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user)) throw new Error("Forbidden");
}

function lines(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isUrl(s: string, httpsOnly: boolean): boolean {
  try {
    const u = new URL(s);
    return httpsOnly ? u.protocol === "https:" : u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

interface UniValues {
  name: string;
  short_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  student_count: number | null;
  campus_type: "public" | "private";
  description: string;
  transit: string[];
  campus_features: string[];
  website: string;
  photo_url: string;
  photo_file: string;
}

// Parses + validates the form. Returns either the typed values or the dict key
// of the first failing field, so the action can map it to a localized message.
function parse(
  formData: FormData,
): { values: UniValues } | { errorKey: string } {
  const s = (k: string) => String(formData.get(k) ?? "").trim();

  const name = s("name");
  if (!name) return { errorKey: "errName" };
  const short_name = s("short_name");
  if (!short_name) return { errorKey: "errShortName" };
  const city = s("city");
  if (!city) return { errorKey: "errCity" };
  const state = s("state");
  if (!state) return { errorKey: "errState" };

  const lat = Number(s("lat"));
  const lng = Number(s("lng"));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return { errorKey: "errCoords" };
  }

  const studentRaw = s("student_count");
  let student_count: number | null = null;
  if (studentRaw !== "") {
    const n = Number(studentRaw);
    if (!Number.isInteger(n) || n < 0) return { errorKey: "errStudentCount" };
    student_count = n;
  }

  const campusTypeRaw = s("campus_type");
  if (campusTypeRaw !== "public" && campusTypeRaw !== "private") {
    return { errorKey: "errType" };
  }

  const description = s("description");
  if (!description) return { errorKey: "errDescription" };
  const transit = lines(s("transit"));
  if (transit.length === 0) return { errorKey: "errTransit" };
  const campus_features = lines(s("campus_features"));
  if (campus_features.length === 0) return { errorKey: "errFeatures" };

  const website = s("website");
  if (!isUrl(website, true)) return { errorKey: "errWebsite" };
  const photo_url = s("photo_url");
  if (!isUrl(photo_url, false)) return { errorKey: "errPhotoUrl" };
  const photo_file = s("photo_file");
  if (!photo_file) return { errorKey: "errPhotoFile" };

  return {
    values: {
      name,
      short_name,
      city,
      state,
      lat,
      lng,
      student_count,
      campus_type: campusTypeRaw,
      description,
      transit,
      campus_features,
      website,
      photo_url,
      photo_file,
    },
  };
}

// Derives a unique slug from the short name (falling back to the full name),
// deduping against the slugs already in the table (append -2, -3, …). The slug
// is the URL-stable token; it is set once at create and never changed on edit.
async function deriveUniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  shortName: string,
  name: string,
): Promise<string> {
  const base = slugify(shortName) || slugify(name) || "campus";
  const { data } = await admin.from("universities").select("slug");
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

type DuplicateHit =
  | { kind: "name"; name: string }
  | { kind: "location"; name: string };

// Guards a create/edit against the campuses already LISTED (deleted_at IS NULL,
// matching "currently listed"). A name clash (case-insensitive on either the
// full name or the short name, since the short name drives the slug) or a
// location within DUPLICATE_RADIUS_KM of an existing pin is a duplicate. On edit
// the row being saved is excluded by slug so re-saving it is never a self-clash.
// Name takes priority over location when both would match.
async function findDuplicate(
  admin: ReturnType<typeof createAdminClient>,
  values: UniValues,
  excludeSlug?: string,
): Promise<DuplicateHit | null> {
  const { data } = await admin
    .from("universities")
    .select("slug, name, short_name, lat, lng")
    .is("deleted_at", null);
  const rows = (data ?? []).filter((r) => r.slug !== excludeSlug);

  const newName = values.name.trim().toLowerCase();
  const newShort = values.short_name.trim().toLowerCase();
  for (const r of rows) {
    const rName = String(r.name ?? "").trim().toLowerCase();
    const rShort = String(r.short_name ?? "").trim().toLowerCase();
    if (rName === newName || rShort === newShort) {
      return { kind: "name", name: r.name as string };
    }
  }

  for (const r of rows) {
    if (r.lat == null || r.lng == null) continue;
    const km = haversineKm(values.lat, values.lng, Number(r.lat), Number(r.lng));
    if (km <= DUPLICATE_RADIUS_KM) {
      return { kind: "location", name: r.name as string };
    }
  }

  return null;
}

function revalidate(slug?: string): void {
  revalidatePath("/admin/universities");
  revalidatePath("/universities");
  if (slug) revalidatePath(`/universities/${slug}`);
  // Bust the cross-request cache backing getAllUniversities (navbar search,
  // listings filter, distance sort) so admin edits surface immediately.
  revalidateTag("universities", "max");
}

export async function createUniversityAction(
  formData: FormData,
): Promise<UniActionResult> {
  await assertAdmin();
  const u = (await getDictionary()).admin.uni;

  const parsed = parse(formData);
  if ("errorKey" in parsed) {
    return { error: u[parsed.errorKey as keyof typeof u] as string };
  }

  const admin = createAdminClient();

  const dup = await findDuplicate(admin, parsed.values);
  if (dup) {
    return {
      error:
        dup.kind === "name"
          ? format(u.errDuplicateName, { name: dup.name })
          : format(u.errDuplicateLocation, { name: dup.name }),
    };
  }

  const slug = await deriveUniqueSlug(
    admin,
    parsed.values.short_name,
    parsed.values.name,
  );

  const { error } = await admin.from("universities").insert({
    id: randomUUID(),
    slug,
    ...parsed.values,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidate(slug);
  return { ok: true, slug };
}

export async function updateUniversityAction(
  formData: FormData,
): Promise<UniActionResult> {
  await assertAdmin();
  const u = (await getDictionary()).admin.uni;

  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: u.errNotFound };

  const parsed = parse(formData);
  if ("errorKey" in parsed) {
    return { error: u[parsed.errorKey as keyof typeof u] as string };
  }

  const admin = createAdminClient();

  const dup = await findDuplicate(admin, parsed.values, slug);
  if (dup) {
    return {
      error:
        dup.kind === "name"
          ? format(u.errDuplicateName, { name: dup.name })
          : format(u.errDuplicateLocation, { name: dup.name }),
    };
  }

  const { data, error } = await admin
    .from("universities")
    .update({ ...parsed.values, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: u.errNotFound };

  revalidate(slug);
  return { ok: true, slug };
}

// List-row form action: toggle a campus between live and hidden (soft-delete).
// Hidden campuses vanish from public reads (RLS) but the admin queue still sees
// them and can restore. Throws on a bad id (no client error UI on the list).
export async function setUniversityHiddenAction(
  formData: FormData,
): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Invalid university id");
  const hide = String(formData.get("hidden") ?? "") === "1";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("universities")
    .update({
      deleted_at: hide ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error) throw new Error(error.message);

  revalidate(data?.slug);
}
