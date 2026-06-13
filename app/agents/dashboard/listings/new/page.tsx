import Link from "next/link";
import { getAllAreas } from "@/lib/data/areas";
import { ListingForm } from "@/components/agents/listing-form";

export const metadata = {
  title: "New listing · Nook",
};

export default async function NewListingPage() {
  const areas = await getAllAreas();

  return (
    <div className="dashboard-page dashboard-form-page">
      <header className="account-content-head">
        <div className="account-content-head-titles">
          <span className="account-content-kicker">Agent dashboard</span>
          <h1>New listing</h1>
        </div>
        <Link href="/agents/dashboard" className="btn btn-ghost btn-sm">
          Back to listings
        </Link>
      </header>
      <ListingForm areas={areas} />
    </div>
  );
}
