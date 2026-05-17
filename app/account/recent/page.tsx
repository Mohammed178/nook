import { getRecentlyViewed } from "@/lib/recent-views";
import { getFavouriteIds } from "@/lib/favourites";
import { getCurrentUser } from "@/lib/auth";
import { RecentList } from "@/components/account/recent-list";

export const metadata = {
  title: "Recent · Nook",
};

export default async function RecentPage() {
  const [items, savedIds, user] = await Promise.all([
    getRecentlyViewed(),
    getFavouriteIds(),
    getCurrentUser(),
  ]);

  return (
    <RecentList
      items={items}
      savedIds={new Set(savedIds)}
      signedIn={user !== null}
    />
  );
}
