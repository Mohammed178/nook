import { getSavedListings } from "@/lib/favourites";
import { SavedList, type SavedListItem } from "@/components/account/saved-list";
import { attachListingRelations } from "@/lib/data/listings-relations";

export const metadata = {
  title: "Saved listings · Nook",
};

export default async function SavedPage() {
  const saved = await getSavedListings();
  const resolved = await attachListingRelations(saved.map((s) => s.listing));
  const items: SavedListItem[] = saved.map((s, i) => ({
    listing: s.listing,
    agent: resolved[i].agent,
    area: resolved[i].area,
    savedAt: s.savedAt,
  }));
  return <SavedList initial={items} />;
}
