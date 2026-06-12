import { HeroSearch } from "@/components/home/hero-search";
import { StatsStrip } from "@/components/home/stats-strip";
import { UniversityRail } from "@/components/home/university-rail";
import { FeaturedListings } from "@/components/home/featured-listings";
import { HowItWorks } from "@/components/home/how-it-works";
import { FeaturedAgents } from "@/components/home/featured-agents";
import { BigCTA } from "@/components/home/big-cta";

export default function HomePage() {
  return (
    <>
      <HeroSearch />
      <StatsStrip />
      <UniversityRail />
      <FeaturedListings />
      <HowItWorks />
      <FeaturedAgents />
      <BigCTA />
    </>
  );
}
