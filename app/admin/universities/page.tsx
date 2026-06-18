import type { Metadata } from "next";
import Link from "next/link";
import { listUniversitiesAdmin } from "./_data";
import { setUniversityHiddenAction } from "./actions";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.universitiesAdmin };
}

export default async function AdminUniversitiesPage() {
  const [universities, dict] = await Promise.all([
    listUniversitiesAdmin(),
    getDictionary(),
  ]);
  const u = dict.admin.uni;

  return (
    <div>
      <div className="account-page-head">
        <span className="account-page-kicker">{dict.admin.trustSafety}</span>
        <h1>{u.title}</h1>
        <p className="account-page-sub">
          {format(universities.length === 1 ? u.subOne : u.sub, {
            count: universities.length,
          })}
        </p>
      </div>

      <div className="admin-uni-toolbar">
        <Link href="/admin/universities/new" className="btn btn-primary btn-sm">
          {u.add}
        </Link>
      </div>

      {universities.length === 0 ? (
        <div className="saved-empty">
          <h2>{u.empty}</h2>
        </div>
      ) : (
        <div className="admin-queue-wrap">
          <table className="admin-queue-table">
            <thead>
              <tr>
                <th>{u.colCampus}</th>
                <th>{u.colLocation}</th>
                <th>{u.colVisibility}</th>
                <th aria-label={dict.admin.colActions} />
              </tr>
            </thead>
            <tbody>
              {universities.map((uni) => {
                const hidden = uni.deletedAt != null;
                return (
                  <tr key={uni.id}>
                    <td>
                      <strong>{uni.shortName}</strong>
                      <span className="admin-uni-fullname">{uni.name}</span>
                    </td>
                    <td>
                      {uni.city}, {uni.state}
                    </td>
                    <td>
                      <span
                        className={`pill ${hidden ? "pill-rejected" : "pill-verified"}`}
                      >
                        {hidden ? u.hidden : u.live}
                      </span>
                    </td>
                    <td className="admin-queue-actions">
                      <Link
                        href={`/admin/universities/${uni.slug}/edit`}
                        className="btn btn-sm btn-secondary"
                      >
                        {u.edit}
                      </Link>
                      <form action={setUniversityHiddenAction}>
                        <input type="hidden" name="id" value={uni.id} />
                        <input
                          type="hidden"
                          name="hidden"
                          value={hidden ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          className={`btn btn-sm ${hidden ? "btn-approve" : "btn-reject"}`}
                        >
                          {hidden ? u.restore : u.hide}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
