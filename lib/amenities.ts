import type { IconName } from "@/components/nook/icon";

export interface AmenitySpec {
  slug: string;
  label: string;
  icon: IconName;
}

const SPECS: AmenitySpec[] = [
  { slug: "wifi", label: "High-speed WiFi", icon: "wifi" },
  { slug: "aircon", label: "Air conditioning", icon: "snow" },
  { slug: "washer", label: "Washing machine", icon: "check" },
  { slug: "kitchen", label: "Private kitchen", icon: "kitchen" },
  { slug: "shared-kitchen", label: "Shared kitchen", icon: "kitchen" },
  { slug: "parking", label: "Parking included", icon: "car" },
  { slug: "garden", label: "Garden / outdoor area", icon: "park" },
  { slug: "pool", label: "Pool", icon: "pool" },
  { slug: "gym", label: "Gym", icon: "gym" },
  { slug: "security", label: "24/7 security", icon: "shield" },
  { slug: "concierge", label: "Concierge", icon: "check" },
];

const BY_SLUG = new Map(SPECS.map((s) => [s.slug, s]));

export function amenitySpec(slug: string): AmenitySpec {
  return BY_SLUG.get(slug) ?? {
    slug,
    label: slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: "check",
  };
}
