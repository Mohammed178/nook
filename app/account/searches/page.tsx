import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { getSavedSearchesWithCounts } from "@/lib/saved-searches";
import { SavedSearchesList } from "@/components/account/saved-searches-list";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return { title: meta.savedSearches };
}

export default async function SavedSearchesPage() {
  const items = await getSavedSearchesWithCounts();
  return <SavedSearchesList initial={items} />;
}
