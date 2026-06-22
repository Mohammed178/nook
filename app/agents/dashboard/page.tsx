import type { Metadata } from "next";
import Link from "next/link";
import { getAgentListings } from "@/lib/data/agent-listings";
import { getAllAreas } from "@/lib/data/areas";
import type { Listing, ListingStatus } from "@/lib/types";
import { Icon } from "@/components/nook/icon";
import { ArchiveButton } from "@/components/agents/archive-button";
import { restoreListingAction } from "@/app/agents/dashboard/listings/actions";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format, LOCALE_DATE_TAG, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.myListings };
}

type AgentsDict = Dictionary["agents"];

function statusLabel(status: ListingStatus, t: AgentsDict): string {
  switch (status) {
    case "draft":
      return t.statusDraft;
    case "available":
      return t.statusAvailable;
    case "reserved":
      return t.statusReserved;
    case "rented":
      return t.statusRented;
  }
}

function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "medium",
  }).format(d);
}

function StatusPill({ status, t }: { status: ListingStatus; t: AgentsDict }) {
  return (
    <span className={`pill pill-status-${status}`}>
      <span className="pill-dot" aria-hidden="true" />
      {statusLabel(status, t)}
    </span>
  );
}

// Practical density (PRODUCT.md): title, status, price, last updated, the facts
// an agent needs, not decorative space. Areas are resolved once for the area
// name; falls back to the stored id if the area is missing.
function ListingRow({
  listing,
  areaName,
  archived,
  index,
  t,
  locale,
  editLabel,
}: {
  listing: Listing;
  areaName: string;
  archived: boolean;
  index: number;
  t: AgentsDict;
  locale: Locale;
  editLabel: string;
}) {
  return (
    <li className="listing-row" style={{ "--i": index } as React.CSSProperties}>
      <div className="listing-row-main">
        <div className="listing-row-head">
          <span className="listing-row-title">{listing.title}</span>
          <StatusPill status={listing.status} t={t} />
        </div>
        <div className="listing-row-meta">
          <span>{format(t.perMonthFull, { price: listing.priceMonthly })}</span>
          <span aria-hidden="true">·</span>
          <span>{areaName}</span>
          <span aria-hidden="true">·</span>
          <span>{format(t.updated, { date: formatDate(listing.updatedAt, locale) })}</span>
        </div>
      </div>
      <div className="listing-row-actions">
        {archived ? (
          <form action={restoreListingAction}>
            <input type="hidden" name="id" value={listing.id} />
            <button type="submit" className="btn btn-secondary btn-sm">
              {t.restore}
            </button>
          </form>
        ) : (
          <>
            <Link
              href={`/agents/dashboard/listings/${listing.id}/edit`}
              className="btn btn-ghost btn-sm"
            >
              {editLabel}
            </Link>
            <ArchiveButton listingId={listing.id} />
          </>
        )}
      </div>
    </li>
  );
}

export default async function DashboardPage() {
  const [{ live, archived }, areas, dict, locale] = await Promise.all([
    getAgentListings(),
    getAllAreas(),
    getDictionary(),
    getLocale(),
  ]);
  const t = dict.agents;
  const editLabel = dict.common.edit;
  const areaName = (id: string) =>
    areas.find((a) => a.id === id)?.name ?? t.areaUnknown;

  // Lifecycle counts from the already-fetched listings (no extra query). "Live"
  // = published & visible (any non-draft status); "available" is the bookable
  // subset of those; "drafts" are not listed yet; "archived" are soft-deleted.
  const publishedCount = live.filter((l) => l.status !== "draft").length;
  const availableCount = live.filter((l) => l.status === "available").length;
  const draftCount = live.filter((l) => l.status === "draft").length;
  const archivedCount = archived.length;
  const stats = [
    { key: "live", icon: "eye" as const, value: publishedCount, label: t.stats.live },
    { key: "available", icon: "check-circle" as const, value: availableCount, label: t.stats.available },
    { key: "drafts", icon: "list" as const, value: draftCount, label: t.stats.drafts },
    { key: "archived", icon: "eye-off" as const, value: archivedCount, label: t.stats.archived },
  ];

  return (
    <div className="dashboard-page">
      <header className="account-content-head">
        <div className="account-content-head-titles">
          <span className="account-content-kicker">{dict.accountNav.agentDashboard}</span>
          <h1>{t.myListings}</h1>
        </div>
        <Link
          href="/agents/dashboard/listings/new"
          className="btn btn-primary btn-sm"
        >
          {t.newListing}
        </Link>
      </header>

      <ul className="dash-stats" aria-label={t.stats.aria}>
        {stats.map((s, i) => (
          <li
            key={s.key}
            className="dash-stat"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="dash-stat-num">{s.value}</span>
            <span className="dash-stat-label">
              <Icon name={s.icon} size={15} className="ico" aria-hidden="true" />
              {s.label}
            </span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="live-heading" className="dashboard-section">
        <h2 id="live-heading" className="dashboard-section-title">
          {t.live}
        </h2>
        {live.length === 0 ? (
          <p className="dashboard-empty">{t.noLiveListings}</p>
        ) : (
          <ul className="listing-list">
            {live.map((l, i) => (
              <ListingRow
                key={l.id}
                listing={l}
                areaName={areaName(l.areaId)}
                archived={false}
                index={i}
                t={t}
                locale={locale}
                editLabel={editLabel}
              />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section aria-labelledby="archived-heading" className="dashboard-section">
          <h2 id="archived-heading" className="dashboard-section-title">
            {t.archived}
          </h2>
          <p className="help">{t.archivedHelp}</p>
          <ul className="listing-list">
            {archived.map((l, i) => (
              <ListingRow
                key={l.id}
                listing={l}
                areaName={areaName(l.areaId)}
                archived
                index={i}
                t={t}
                locale={locale}
                editLabel={editLabel}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
