import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { ListingCard } from "@/components/nook/listing-card";
import { PhoneReveal } from "@/components/listings/phone-reveal";
import { getAgentProfile } from "@/lib/data/agent-directory";
import { getAllUniversities } from "@/lib/data/universities";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { isUniversityLister } from "@/lib/types";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const [{ slug }, { meta }] = await Promise.all([params, getDictionary()]);
  const profile = await getAgentProfile(slug);
  if (!profile) return { title: meta.agentNotFound };
  return { title: format(meta.agentTitle, { name: profile.agent.name }) };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AgentProfilePage({ params }: ProfilePageProps) {
  const [{ slug }, dict, locale] = await Promise.all([
    params,
    getDictionary(),
    getLocale(),
  ]);
  const profile = await getAgentProfile(slug);
  if (!profile) notFound();

  const { agent, listings, areaById } = profile;
  const t = dict.agentProfile;
  const d = dict.listingDetail;
  const waNumber = agent.whatsapp.replace(/[^0-9]/g, "");
  // University lister (migration 0036): official-account hero treatment, the
  // licence line self-hides (null by constraint), and a link to the campus guide.
  const isUniversity = isUniversityLister(agent);
  const universitySlug =
    isUniversity && agent.universityId
      ? (await getAllUniversities()).find((u) => u.id === agent.universityId)?.slug
      : undefined;
  const langName: Record<Locale, string> = {
    en: t.langEn,
    ms: t.langMs,
    ar: t.langAr,
  };

  return (
    <>
      <Navbar active="agents" />

      <div className="container agent-profile">
        <nav className="agent-crumb" aria-label={t.breadcrumbAgents}>
          <Link href="/agents">{t.breadcrumbAgents}</Link>
          <Icon name="chevron-right" size={14} className="rtl-flip" />
          <span>{agent.name}</span>
        </nav>

        <header className="agent-hero">
          {agent.avatarUrl ? (
            <div
              className="agent-hero-av"
              style={{ backgroundImage: `url(${agent.avatarUrl})` }}
              aria-hidden
            />
          ) : (
            <div className="agent-hero-av agent-hero-av-initials">
              {initials(agent.name)}
            </div>
          )}

          <div className="agent-hero-main">
            <h1>
              {agent.name}
              {agent.status === "approved" && (
                <span
                  className="agent-hero-verif"
                  title={isUniversity ? d.officialUniversityAccount : d.bovaepLicensed}
                >
                  <Icon name={isUniversity ? "school" : "check-circle"} size={20} />
                </span>
              )}
            </h1>
            {agent.agency && <div className="agent-hero-agency">{agent.agency}</div>}
            {isUniversity ? (
              <div className="agent-hero-license">
                {d.officialUniversityAccount}
                {universitySlug ? (
                  <>
                    {" · "}
                    <Link href={`/universities/${universitySlug}`}>{t.viewCampusGuide}</Link>
                  </>
                ) : null}
              </div>
            ) : agent.bovaepLicence ? (
              <div className="agent-hero-license">
                {format(d.bovaepNum, { licence: agent.bovaepLicence })}
              </div>
            ) : null}

            <div className="agent-facts">
              <span className="agent-fact">
                <Icon name="grid" size={14} />
                <strong>{listings.length}</strong>
                <span className="agent-fact-sub">{t.activeLabel}</span>
              </span>
              <span className="agent-fact">
                <Icon name="calendar" size={14} />
                <strong>
                  {format(
                    agent.yearsActive === 1 ? t.yearActive : t.yearsActive,
                    { years: agent.yearsActive },
                  )}
                </strong>
              </span>
              <span className="agent-fact">
                <Icon name="chat" size={14} />
                <strong>
                  {format(t.responseTime, { mins: agent.responseTimeMins })}
                </strong>
              </span>
            </div>

            {agent.languages.length > 0 && (
              <div className="agent-langs">
                <Icon name="globe" size={13} />
                <span>{t.speaks}:</span>
                {agent.languages.map((l) => langName[l]).join(" · ")}
              </div>
            )}
          </div>
        </header>

        <div className="agent-body">
          <div className="agent-body-main">
            {agent.bio && (
              <section className="agent-section">
                <h2>{format(t.about, { name: agent.name })}</h2>
                <p className="agent-bio">{agent.bio}</p>
              </section>
            )}

            <section className="agent-section">
              <h2>{format(t.listingsTitle, { name: agent.name })}</h2>
              {listings.length === 0 ? (
                <p className="agent-empty">{t.noListings}</p>
              ) : (
                <div className="agent-listings">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      agent={agent}
                      area={areaById.get(listing.areaId) ?? null}
                      card={dict.card}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Contact rail, mirrors the listing-detail agent panel. */}
          <aside className="agent-contact">
            <div className="agent-contact-card">
              <h2>{t.contactTitle}</h2>
              <PhoneReveal phone={agent.phone ?? agent.whatsapp} />
              <div className="agent-contact-btns">
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <span className="wa-live-dot" aria-hidden="true" />
                  <Icon name="whatsapp" size={16} /> {d.whatsapp}
                </a>
                <a
                  href={`tel:${(agent.phone ?? agent.whatsapp).replace(/\s/g, "")}`}
                  className="btn btn-call"
                >
                  <Icon name="phone" size={16} /> {d.call}
                </a>
              </div>
              <div className="agent-contact-hint">
                <Icon name="chat" size={12} /> {d.replyHint}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
