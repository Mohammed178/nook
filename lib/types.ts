export type ListingType = "room" | "studio" | "apartment" | "house";
export type ListingStatus = "available" | "reserved" | "rented";
export type FurnishingLevel = "unfurnished" | "partial" | "full";
export type Gender = "male" | "female" | "mixed";
export type Density = "compact" | "default" | "comfortable";
export type Locale = "en" | "ms" | "ar";
export type BrandTone = "olive" | "burnt" | "red";

export interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  studentCount?: number;
  campusType?: "public" | "private";
}

export interface Area {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  nearbyUniversityIds: string[];
  vibe?: string;
}

export interface Agent {
  id: string;
  name: string;
  agency?: string;
  rating: number;
  reviewCount: number;
  responseTimeMins: number;
  languages: Locale[];
  avatarUrl: string;
  whatsapp: string;
  phone?: string;
  email?: string;
  verified: boolean;
  yearsActive: number;
  bio?: string;
  bovaepLicence?: string;
}

export type NearbyPOIKind =
  | "uni"
  | "train"
  | "mall"
  | "mart"
  | "park"
  | "hospital"
  | "food";

export interface NearbyPOI {
  name: string;
  kind: NearbyPOIKind;
  distanceMetres: number;
}

export interface Review {
  id: string;
  listingId?: string;
  agentId?: string;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  type: ListingType;
  status: ListingStatus;
  priceMonthly: number;
  deposit?: number;
  utilitiesIncluded?: boolean;
  bedrooms: number;
  bathrooms: number;
  sizeSqft?: number;
  furnishing: FurnishingLevel;
  genderPreference?: Gender;
  availableFrom: string;
  minStayMonths?: number;
  address: string;
  areaId: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  nearbyUniversityIds: string[];
  walkMinsToCampus?: number;
  metresToCampus?: number;
  amenities: string[];
  photos: string[];
  description: string;
  agentId: string;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  listedToday?: boolean;
  createdAt: string;
  updatedAt: string;
}
