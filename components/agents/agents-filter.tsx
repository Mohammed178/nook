"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useDict } from "@/lib/i18n/context";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/agents/searchable-select";

interface AgentsFilterProps {
  universities: SelectOption[];
  areas: SelectOption[];
  university: string;
  area: string;
}

function hrefFor(university: string, area: string): string {
  const p = new URLSearchParams();
  if (university) p.set("university", university);
  if (area) p.set("area", area);
  const q = p.toString();
  return q ? `/agents?${q}` : "/agents";
}

// Two searchable comboboxes (campus, area) that re-query the directory on
// select. URL-driven so a filtered view is shareable and the back button works;
// useTransition keeps the list interactive while the server re-renders.
export function AgentsFilter({
  universities,
  areas,
  university,
  area,
}: AgentsFilterProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useDict().agentsDirectory;

  const go = (uni: string, ar: string) =>
    startTransition(() => router.push(hrefFor(uni, ar)));

  return (
    <div
      className={`agents-filter${pending ? " is-pending" : ""}`}
      role="group"
      aria-label={t.filtersAria}
    >
      <SearchableSelect
        label={t.filterUniversity}
        placeholder={t.searchUniversity}
        allLabel={t.allUniversities}
        noMatchesLabel={t.noMatches}
        clearLabel={t.clearSelection}
        options={universities}
        value={university}
        onChange={(v) => go(v, area)}
      />
      <SearchableSelect
        label={t.filterArea}
        placeholder={t.searchArea}
        allLabel={t.allAreas}
        noMatchesLabel={t.noMatches}
        clearLabel={t.clearSelection}
        options={areas}
        value={area}
        onChange={(v) => go(university, v)}
      />
    </div>
  );
}
