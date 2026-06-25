import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { FilterBar } from "@/components/listings/filter-bar";
import { ListingsBody } from "@/components/listings/listings-body";
import { getAllUniversities, toSearchUniversities } from "@/lib/data/universities";
import { getAllAreas } from "@/lib/data/areas";
import { attachListingRelations } from "@/lib/data/listings-relations";
import { getAllListings, getFilteredListings } from "@/lib/data/listings";
import { buildPriceSignals } from "@/lib/data/price-intel";
import { getFavouriteIds } from "@/lib/favourites";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Gender } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import {
  parseListingSearchParams,
  preserveQueryString,
  defaultSort,
  resolveLocationLabel,
  type RawSearchParams,
  type SortKey,
} from "@/lib/listings-search";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.findRoom, description: meta.listingsDesc };
}

type ListingsDict = Dictionary["listings"];
const KLANG_VALLEY_CENTER: [number, number] = [3.1073, 101.6067];

function pageHeading(
  label: ReturnType<typeof resolveLocationLabel>,
  l: ListingsDict,
): string {
  if (label.area) return format(l.roomsInArea, { area: label.area });
  if (label.universityShort)
    return format(l.roomsNearUni, { uni: label.universityShort });
  return l.roomsInKV;
}

function pageMeta(
  count: number,
  label: ReturnType<typeof resolveLocationLabel>,
  l: ListingsDict,
): string {
  if (count === 0) return l.noMatchingMeta;
  if (label.universityShort) {
    return format(l.withinWalking, { uni: label.universityShort });
  }
  return "";
}

function locationPillLabel(
  label: ReturnType<typeof resolveLocationLabel>,
  l: ListingsDict,
): string {
  if (label.area) return label.area;
  if (label.universityShort) return label.universityShort;
  return l.kvShort;
}

function sortLabelFor(sort: SortKey, l: ListingsDict, uniShort?: string): string {
  switch (sort) {
    case "priceAsc":
      return l.sortedPriceAsc;
    case "priceDesc":
      return l.sortedPriceDesc;
    case "distance":
      return uniShort
        ? format(l.sortedDistanceUni, { uni: uniShort })
        : l.sortedDistance;
    case "newest":
      return l.sortedNewest;
  }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const params = parseListingSearchParams(sp);
  const sort = defaultSort(params);
  const currentQuery = preserveQueryString(sp);

  const [savedIds, user, dict, universities] = await Promise.all([
    getFavouriteIds(),
    getCurrentUser(),
    getDictionary(),
    getAllUniversities(),
  ]);
  const l = dict.listings;
  const signedIn = user !== null;
  // slug→University map for label resolution + map centring, includes
  // admin-added campuses (0022). Keyed by slug (the ?university= token).
  const uniByKey = new Map(universities.map((u) => [u.slug, u]));
  const label = resolveLocationLabel(params, uniByKey);

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

  const listings = await getFilteredListings(params, viewerGender);

  const [areas, items, allListings] = await Promise.all([
    getAllAreas(),
    attachListingRelations(listings),
    getAllListings(),
  ]);
  // Fair Price signals (features.md #1) over the FULL live market, not the
  // filtered subset — the distribution must reflect the whole area+type cohort.
  // Serialised to a plain record for the client ListingsBody.
  const priceSignals = Object.fromEntries(buildPriceSignals(allListings));
  // Keyed by slug, `params.area` carries the URL value (= area.slug).
  const areaLookup = Object.fromEntries(areas.map((a) => [a.slug, a]));

  let mapCenter: [number, number] = KLANG_VALLEY_CENTER;
  let mapZoom = 11;
  const filterUni = params.university ? uniByKey.get(params.university) : undefined;
  if (filterUni) {
    mapCenter = [filterUni.lat, filterUni.lng];
    mapZoom = 13;
  } else if (params.area && areaLookup[params.area]) {
    const a = areaLookup[params.area];
    mapCenter = [a.lat, a.lng];
    mapZoom = 13;
  }

  return (
    <>
      <Navbar active="listings" />
      <FilterBar
        params={params}
        resultCount={listings.length}
        locationLabel={locationPillLabel(label, l)}
        effectiveSort={sort}
        signedIn={signedIn}
        viewerGender={viewerGender}
        areaLookup={areaLookup}
        areas={areas}
        universities={toSearchUniversities(universities)}
      />

      <div className="breadcrumb">
        <Link href="/">Nook</Link>
        <span>›</span>
        <Link href="/listings">{label.state ?? l.kvShort}</Link>
        <span>›</span>
        {label.area ? (
          <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>
            {label.area}
          </span>
        ) : label.universityShort ? (
          <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>
            {format(l.near, { uni: label.universityShort })}
          </span>
        ) : (
          <span style={{ color: "var(--ink-700)", fontWeight: 600 }}>{l.roomsWord}</span>
        )}
      </div>

      <div className="listings-h1">
        <div>
          <h1>{pageHeading(label, l)}</h1>
          {pageMeta(listings.length, label, l) ? (
            <div className="meta">{pageMeta(listings.length, label, l)}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm">
            <Icon name="share" size={14} /> {l.share}
          </button>
        </div>
      </div>

      <ListingsBody
        items={items}
        currentQuery={currentQuery}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        sortLabel={sortLabelFor(sort, l, label.universityShort)}
        savedIds={savedIds}
        signedIn={signedIn}
        priceSignals={priceSignals}
      />
    </>
  );
}
