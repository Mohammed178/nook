import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { UNIVERSITY_CONTENT } from "@/lib/seed/university-content";
import { getAllListings } from "@/lib/data/listings";
import { isNearCampus, NEAR_CAMPUS_RADIUS_KM } from "@/lib/distance";

export const metadata: Metadata = {
  title: "Universities · Nook",
  description:
    "Student housing guides for ten Klang Valley campuses, transit, neighbourhoods, and verified rooms near each university.",
};

const formatStudents = new Intl.NumberFormat("en-MY");

// Mosaic spans on the 6-column grid, deliberately uneven so the page reads
// as an editorial photo board, not a uniform card row. Index-aligned with
// UNIVERSITIES order; rows resolve to [4+2][2+2+2][3+3][2+2+2].
const SPANS = [4, 2, 2, 2, 2, 3, 3, 2, 2, 2];

export default async function UniversitiesPage() {
  // Compute-don't-claim: the per-campus room count derives from listing
  // coordinates at read (4c-B2), never a stored tag.
  const listings = await getAllListings();
  const countFor = (uniId: string) =>
    listings.filter((l) => isNearCampus(l.lat, l.lng, uniId)).length;

  return (
    <>
      <Navbar active="universities" />

      <div className="container uni-index">
        <header className="uni-index-head">
          <div>
            <div className="kicker">Campus guides</div>
            <h1>
              Ten campuses.
              <br />
              One honest map of each.
            </h1>
          </div>
          <p className="dek">
            Transit, the neighbourhoods students actually rent in, and the
            verified rooms within {NEAR_CAMPUS_RADIUS_KM} km, every distance
            computed from coordinates, never an agent&apos;s claim.
          </p>
        </header>

        <ul className="uni-mosaic">
          {UNIVERSITIES.map((u, i) => {
            const count = countFor(u.id);
            const content = UNIVERSITY_CONTENT[u.id];
            return (
              <li
                key={u.id}
                className={`uni-tile u-span-${SPANS[i]}`}
                style={{ "--i": i } as React.CSSProperties}
              >
                <Link href={`/universities/${u.id}`} className="uni-tile-link">
                  <div
                    className="uni-tile-photo"
                    role="img"
                    aria-label={`${u.name} campus`}
                    style={
                      content
                        ? { backgroundImage: `url(${content.photo})` }
                        : undefined
                    }
                  >
                    <span className="uni-tile-short" aria-hidden="true">
                      {u.shortName}
                    </span>
                    {u.campusType && (
                      <span className="uni-tile-type">
                        {u.campusType === "public" ? "Public" : "Private"}
                      </span>
                    )}
                  </div>
                  <div className="uni-tile-body">
                    <h2>{u.name}</h2>
                    <div className="loc">
                      <Icon name="pin" size={12} />
                      {u.city}, {u.state}
                    </div>
                    <div className="meta">
                      {u.studentCount != null && (
                        <span className="v">
                          {formatStudents.format(u.studentCount)} students
                        </span>
                      )}
                      <span className="v">
                        {count} {count === 1 ? "room" : "rooms"} nearby
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
