import type { Metadata } from "next";
import { getRecentlyViewed } from "@/lib/recent-views";
import { getFavouriteIds } from "@/lib/favourites";
import { getCurrentUser } from "@/lib/auth";
import {
  RecentList,
  type RecentListItem,
} from "@/components/account/recent-list";
import { attachListingRelations } from "@/lib/data/listings-relations";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.recent };
}

export default async function RecentPage() {
  const [recents, savedIds, user, dict] = await Promise.all([
    getRecentlyViewed(),
    getFavouriteIds(),
    getCurrentUser(),
    getDictionary(),
  ]);

  const resolved = await attachListingRelations(recents.map((r) => r.listing));
  const items: RecentListItem[] = recents.map((r, i) => ({
    listing: r.listing,
    agent: resolved[i].agent,
    area: resolved[i].area,
    viewedAt: r.viewedAt,
  }));

  return (
    <RecentList
      items={items}
      savedIds={new Set(savedIds)}
      signedIn={user !== null}
      dict={dict}
    />
  );
}
