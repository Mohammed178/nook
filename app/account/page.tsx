import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/nook/icon";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.account };
}

// Profile fields that count toward completeness. Email is excluded, it is set
// at sign-up and not user-editable here, so it would always read as complete.
const PROFILE_FIELDS = [
  "display_name",
  "phone",
  "country",
  "university_id",
  "gender_preference",
] as const;

function firstName(name: string, fallback: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || fallback;
}

export default async function AccountOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Layout already gates /account, but never render an overview for a stray
  // logged-out request.
  if (!user) redirect("/login?redirect=/account");

  // Cheap head-only counts (no row payloads) + the profile row for the
  // completeness meter. All reads are RLS-pinned to the current user.
  const [savedRes, recentRes, searchesRes, profileRes, dict] = await Promise.all([
    supabase
      .from("favourites")
      .select("listing_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("recent_views")
      .select("listing_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("saved_searches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("display_name, phone, country, university_id, gender_preference")
      .eq("id", user.id)
      .maybeSingle(),
    getDictionary(),
  ]);
  const h = dict.accountHome;

  const savedCount = savedRes.count ?? 0;
  const recentCount = recentRes.count ?? 0;
  const searchesCount = searchesRes.count ?? 0;

  const profile = profileRes.data;
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = profile?.[f];
    return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
  }).length;
  const completeness = Math.round((filled / PROFILE_FIELDS.length) * 100);
  const name = firstName(
    profile?.display_name ?? user.email?.split("@")[0] ?? h.friend,
    h.friend,
  );

  const stats = [
    {
      href: "/account/saved",
      label: h.savedListings,
      icon: "heart" as const,
      value: savedCount,
    },
    {
      href: "/account/recent",
      label: h.recentlyViewed,
      icon: "calendar" as const,
      value: recentCount,
    },
    {
      href: "/account/searches",
      label: h.savedSearches,
      icon: "search" as const,
      value: searchesCount,
    },
  ];

  return (
    <div className="acct-overview">
      <header className="acct-hero">
        <div>
          <span className="kicker">{h.yourAccount}</span>
          <h1>
            {h.welcomeBack.split("{name}")[0]}
            <span className="accent">{name}</span>
            {h.welcomeBack.split("{name}")[1]}
          </h1>
        </div>
        {completeness < 100 ? (
          <div className="acct-meter">
            <div className="acct-meter-top">
              <span>{h.profileCompleteness}</span>
              <span className="acct-meter-pct">{completeness}%</span>
            </div>
            <div
              className="acct-meter-track"
              role="progressbar"
              aria-valuenow={completeness}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={h.profileCompleteness}
            >
              <span
                className="acct-meter-fill"
                style={{ "--pct": `${completeness}%` } as React.CSSProperties}
              />
            </div>
            <Link href="/account/profile" className="acct-meter-link">
              {h.finishProfile}
            </Link>
          </div>
        ) : (
          <p className="dek">{h.profileComplete}</p>
        )}
      </header>

      <nav className="acct-stats" aria-label={h.activityAria}>
        {stats.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className="acct-stat"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="acct-stat-num">{s.value}</span>
            <span className="acct-stat-label">
              <Icon name={s.icon} size={15} className="ico" aria-hidden="true" />
              {s.label}
            </span>
          </Link>
        ))}
      </nav>

      <section className="acct-quick">
        <h2>{h.pickUp}</h2>
        <div className="acct-quick-row">
          <Link href="/listings" className="btn btn-primary">
            {h.browseListings}
          </Link>
          <Link href="/account/profile" className="btn btn-secondary">
            {h.editProfile}
          </Link>
          {savedCount > 0 ? (
            <Link href="/account/saved" className="btn btn-ghost">
              {h.viewSaved}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
