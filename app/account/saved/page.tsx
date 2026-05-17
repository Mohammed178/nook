import { getSavedListings } from "@/lib/favourites";
import { SavedList } from "@/components/account/saved-list";

export const metadata = {
  title: "Saved listings · Nook",
};

export default async function SavedPage() {
  const items = await getSavedListings();
  return <SavedList initial={items} />;
}
