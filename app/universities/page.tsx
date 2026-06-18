import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { getAllUniversities } from "@/lib/data/universities";
import { getAllListings } from "@/lib/data/listings";
import { buildUniIndex, isNearCampus, NEAR_CAMPUS_RADIUS_KM } from "@/lib/distance";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.universities };
}

const formatStudents = new Intl.NumberFormat("en-MY");

// Mosaic spans on the 6-column grid, deliberately uneven so the page reads
// as an editorial photo board, not a uniform card row. Cycled by index (the
// campus list is DB-backed and variable-length since 0022); the pattern tiles
// to [4+2][2+2+2][3+3] and repeats, ragged final rows are fine on the grid.
const SPAN_PATTERN = [4, 2, 2, 2, 2, 3, 3];

export default async function UniversitiesPage() {
  // Compute-don't-claim: the per-campus room count derives from listing
  // coordinates at read (4c-B2), never a stored tag.
  const [universities, listings, dict] = await Promise.all([
    getAllUniversities(),
    getAllListings(),
    getDictionary(),
  ]);
  const t = dict.universities;
  const idx = buildUniIndex(universities);
  const countFor = (slug: string) =>
    listings.filter((l) => isNearCampus(l.lat, l.lng, slug, NEAR_CAMPUS_RADIUS_KM, idx))
      .length;

  return (
    <>
      <Navbar active="universities" />

      <div className="container uni-index">
        <header className="uni-index-head">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1>
              {t.headline1}
              <br />
              {t.headline2}
            </h1>
          </div>
          <p className="dek">
            {format(t.indexDek, { radius: NEAR_CAMPUS_RADIUS_KM })}
          </p>
        </header>

        <ul className="uni-mosaic">
          {universities.map((uni, i) => {
            const count = countFor(uni.slug);
            return (
              <li
                key={uni.id}
                className={`uni-tile u-span-${SPAN_PATTERN[i % SPAN_PATTERN.length]}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <Link href={`/universities/${uni.slug}`} className="uni-tile-link">
                  <div
                    className="uni-tile-photo"
                    role="img"
                    aria-label={format(t.campusAria, { name: uni.name })}
                    style={
                      uni.photo
                        ? { backgroundImage: `url(${uni.photo})` }
                        : undefined
                    }
                  >
                    <span className="uni-tile-short" aria-hidden="true">
                      {uni.shortName}
                    </span>
                    {uni.campusType && (
                      <span className="uni-tile-type">
                        {uni.campusType === "public" ? t.public : t.private}
                      </span>
                    )}
                  </div>
                  <div className="uni-tile-body">
                    <h2>{uni.name}</h2>
                    <div className="loc">
                      <Icon name="pin" size={12} />
                      {uni.city}, {uni.state}
                    </div>
                    <div className="meta">
                      {uni.studentCount != null && (
                        <span className="v">
                          {format(t.studentsCount, {
                            count: formatStudents.format(uni.studentCount),
                          })}
                        </span>
                      )}
                      <span className="v">
                        {format(count === 1 ? t.roomNearby : t.roomsNearby, {
                          count,
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
