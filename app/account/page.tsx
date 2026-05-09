import Link from "next/link";
import { Icon, type IconName } from "@/components/nook/icon";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Account · Nook",
};

interface Tile {
  href: string;
  icon: IconName;
  title: string;
  blurb: string;
  ready: boolean;
  comingIn?: string;
}

const TILES: Tile[] = [
  {
    href: "/account/profile",
    icon: "user",
    title: "Profile",
    blurb: "Name, contact, university, roommate preference.",
    ready: true,
  },
  {
    href: "/account/saved",
    icon: "heart",
    title: "Saved listings",
    blurb: "Rooms you've hearted while browsing.",
    ready: false,
    comingIn: "Checkpoint E",
  },
  {
    href: "/account/recent",
    icon: "calendar",
    title: "Recent",
    blurb: "Listings you opened in the last 30 days.",
    ready: false,
    comingIn: "Checkpoint F",
  },
  {
    href: "/account/searches",
    icon: "search",
    title: "Saved searches",
    blurb: "Filter sets you reuse — alerts coming later.",
    ready: false,
    comingIn: "Checkpoint G",
  },
];

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <>
      <header className="account-page-head">
        <h1>Welcome, {user?.displayName ?? "friend"}</h1>
        <p className="account-page-sub">
          Your home base. Manage your details, rooms you&apos;re tracking, and saved searches.
        </p>
      </header>

      <div className="account-tiles">
        {TILES.map((tile) =>
          tile.ready ? (
            <Link key={tile.href} href={tile.href} className="account-tile">
              <span className="account-tile-icon">
                <Icon name={tile.icon} size={20} />
              </span>
              <span className="account-tile-body">
                <span className="account-tile-title">{tile.title}</span>
                <span className="account-tile-blurb">{tile.blurb}</span>
              </span>
              <Icon name="chevron-right" size={16} />
            </Link>
          ) : (
            <div
              key={tile.href}
              className="account-tile disabled"
              aria-disabled="true"
              title={`Coming soon — ${tile.comingIn}`}
            >
              <span className="account-tile-icon">
                <Icon name={tile.icon} size={20} />
              </span>
              <span className="account-tile-body">
                <span className="account-tile-title">
                  {tile.title} <span className="account-tile-soon">Soon</span>
                </span>
                <span className="account-tile-blurb">{tile.blurb}</span>
              </span>
            </div>
          ),
        )}
      </div>
    </>
  );
}
