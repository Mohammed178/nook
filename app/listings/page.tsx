import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { FilterBar } from "@/components/listings/filter-bar";
import { ListingsBody } from "@/components/listings/listings-body";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { AREA_BY_ID } from "@/lib/seed/areas";
import { getFavouriteIds } from "@/lib/favourites";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Gender } from "@/lib/types";
import {
  parseListingSearchParams,
  preserveQueryString,
  defaultSort,
  resolveLocationLabel,
  getFilteredListings,
  type RawSearchParams,
  type SortKey,
} from "@/lib/listings-search";

export const metadata: Metadata = {
  title: "Find a room · Nook",
  description: "Browse verified student rooms across Klang Valley.",
};

const KLANG_VALLEY_CENTER: [number, number] = [3.1073, 101.6067];

function pageHeading(label: ReturnType<typeof resolveLocationLabel>): string {
  if (label.area) return `Rooms in ${label.area}`;
  if (label.universityShort) return `Rooms near ${label.universityShort}`;
  return "Rooms in Klang Valley";
}

function pageMeta(count: number, label: ReturnType<typeof resolveLocationLabel>): string {
  if (count === 0) return "No matching rooms. Adjust filters to see more.";
  if (label.universityShort) {
    return `Within walking distance to ${label.universityShort}.`;
  }
  return "";
}

function locationPillLabel(label: ReturnType<typeof resolveLocationLabel>): string {
  if (label.area) return label.area;
  if (label.universityShort) return label.universityShort;
  return "Klang Valley";
}

function sortLabelFor(sort: SortKey, uniShort?: string): string {
  switch (sort) {
    case "priceAsc":
      return "sorted by price (low to high)";
    case "priceDesc":
      return "sorted by price (high to low)";
    case "distance":
      return uniShort
        ? `sorted by distance to ${uniShort}`
        : "sorted by distance";
    case "newest":
      return "sorted by newest first";
  }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const params = parseListingSearchParams(sp);
  const label = resolveLocationLabel(params);
  const sort = defaultSort(params);
  const currentQuery = preserveQueryString(sp);

  const [savedIds, user] = await Promise.all([getFavouriteIds(), getCurrentUser()]);
  const signedIn = user !== null;

  let viewerGender: Gender | undefined;
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("gender_preference")
      .eq("id", user.id)
      .maybeSingle();
    const raw = profile?.gender_preference;
    if (raw === "female" || raw === "male" || raw === "mixed") {
      viewerGender = raw;
    }
  }

  const listings = getFilteredListings(params, viewerGender);

  let mapCenter: [number, number] = KLANG_VALLEY_CENTER;
  let mapZoom = 11;
  if (params.university && UNIVERSITY_BY_ID[params.university]) {
    const u = UNIVERSITY_BY_ID[params.university];
    mapCenter = [u.lat, u.lng];
    mapZoom = 13;
  } else if (params.area && AREA_BY_ID[params.area]) {
    const a = AREA_BY_ID[params.area];
    mapCenter = [a.lat, a.lng];
    mapZoom = 13;
  }

  return (
    <>
      <Navbar active="listings" />
      <FilterBar
        params={params}
        resultCount={listings.length}
        locationLabel={locationPillLabel(label)}
        effectiveSort={sort}
        signedIn={signedIn}
        viewerGender={viewerGender}
      />

      <div className="breadcrumb">
        <Link href="/">Nook</Link>
        <span>›</span>
        <Link href="/listings">{label.state ?? "Klang Valley"}</Link>
        <span>›</span>
        {label.area ? (
          <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>
            {label.area}
          </span>
        ) : label.universityShort ? (
          <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>
            Near {label.universityShort}
          </span>
        ) : (
          <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>Rooms</span>
        )}
      </div>

      <div className="listings-h1">
        <div>
          <h1>{pageHeading(label)}</h1>
          {pageMeta(listings.length, label) ? (
            <div className="meta">{pageMeta(listings.length, label)}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm">
            <Icon name="share" size={14} /> Share
          </button>
        </div>
      </div>

      <ListingsBody
        listings={listings}
        currentQuery={currentQuery}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        sortLabel={sortLabelFor(sort, label.universityShort)}
        savedIds={savedIds}
        signedIn={signedIn}
      />
    </>
  );
}
