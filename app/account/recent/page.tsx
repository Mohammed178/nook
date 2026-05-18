import { getRecentlyViewed } from "@/lib/recent-views";
import { getFavouriteIds } from "@/lib/favourites";
import { getCurrentUser } from "@/lib/auth";
import {
  RecentList,
  type RecentListItem,
} from "@/components/account/recent-list";
import { attachListingRelations } from "@/lib/data/listings-relations";

export const metadata = {
  title: "Recent · Nook",
};

export default async function RecentPage() {
  const [recents, savedIds, user] = await Promise.all([
    getRecentlyViewed(),
    getFavouriteIds(),
    getCurrentUser(),
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
    />
  );
}
