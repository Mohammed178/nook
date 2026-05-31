import Link from "next/link";
import { Icon } from "./icon";
import { NavSearchTrigger } from "./nav-search-trigger";
import { AccountMenu } from "./account-menu";
import { getCurrentUser } from "@/lib/auth";
import { getAllAreas } from "@/lib/data/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";

interface NavbarProps {
  active?: "home" | "listings" | "areas" | "universities" | "help" | "admin";
  transparent?: boolean;
}

const LINKS: { id: NonNullable<NavbarProps["active"]>; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "listings", label: "Find a room", href: "/listings" },
  { id: "areas", label: "Areas", href: "/areas" },
  { id: "universities", label: "Universities", href: "/universities" },
  { id: "help", label: "Help", href: "/help" },
  { id: "admin", label: "Admin", href: "/admin/agents" },
];

export async function Navbar({ active = "home", transparent = false }: NavbarProps) {
  const [user, areas] = await Promise.all([getCurrentUser(), getAllAreas()]);

  return (
    <header className={`topnav${transparent ? " transparent" : ""}`}>
      <div className="topnav-inner">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <span className="logo-mark">N</span>
          <span>nook</span>
        </Link>
        <nav className="nav-links">
          {LINKS.filter((l) => l.id !== "admin" || user?.isAdmin).map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={`nav-link ${active === l.id ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <NavSearchTrigger areas={areas} universities={UNIVERSITIES} />
        <div className="nav-right">
          <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} type="button">
            <Icon name="globe" size={14} /> EN
          </button>
          {user ? (
            <AccountMenu
              displayName={user.displayName}
              agentStatus={user.agentStatus}
            />
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/agents/register" className="btn btn-secondary btn-sm">
                List a property
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
