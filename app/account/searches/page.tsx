import { getSavedSearchesWithCounts } from "@/lib/saved-searches";
import { SavedSearchesList } from "@/components/account/saved-searches-list";

export const metadata = {
  title: "Saved searches · Nook",
};

export default async function SavedSearchesPage() {
  const items = await getSavedSearchesWithCounts();
  return <SavedSearchesList initial={items} />;
}
