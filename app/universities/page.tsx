import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { UNIVERSITY_CONTENT } from "@/lib/seed/university-content";
import { getAllListings } from "@/lib/data/listings";
import { isNearCampus, NEAR_CAMPUS_RADIUS_KM } from "@/lib/distance";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.universities };
}

const formatStudents = new Intl.NumberFormat("en-MY");

// Mosaic spans on the 6-column grid, deliberately uneven so the page reads
// as an editorial photo board, not a uniform card row. Index-aligned with
// UNIVERSITIES order; rows resolve to [4+2][2+2+2][3+3][2+2+2].
const SPANS = [4, 2, 2, 2, 2, 3, 3, 2, 2, 2];

export default async function UniversitiesPage() {
  // Compute-don't-claim: the per-campus room count derives from listing
  // coordinates at read (4c-B2), never a stored tag.
  const [listings, dict] = await Promise.all([
    getAllListings(),
    getDictionary(),
  ]);
  const t = dict.universities;
  const countFor = (uniId: string) =>
    listings.filter((l) => isNearCampus(l.lat, l.lng, uniId)).length;

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
          {UNIVERSITIES.map((uni, i) => {
            const count = countFor(uni.id);
            const content = UNIVERSITY_CONTENT[uni.id];
            return (
              <li
                key={uni.id}
                className={`uni-tile u-span-${SPANS[i]}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <Link href={`/universities/${uni.id}`} className="uni-tile-link">
                  <div
                    className="uni-tile-photo"
                    role="img"
                    aria-label={format(t.campusAria, { name: uni.name })}
                    style={
                      content
                        ? { backgroundImage: `url(${content.photo})` }
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
