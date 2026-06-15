import Link from "next/link";
import { LogoMark } from "@/components/nook/logo";
import { NavSearchTrigger } from "./nav-search-trigger";
import { MobileMenu } from "./mobile-menu";
import { AccountMenu } from "./account-menu";
import { LanguageSwitcher } from "@/components/nook/language-switcher";
import { getCurrentUser } from "@/lib/auth";
import { getAllAreas } from "@/lib/data/areas";
import { UNIVERSITIES } from "@/lib/seed/universities";
import { getDictionary } from "@/lib/i18n/server";

interface NavbarProps {
  active?:
    | "home"
    | "listings"
    | "areas"
    | "universities"
    | "essentials"
    | "help"
    | "admin";
  transparent?: boolean;
}

export async function Navbar({ active = "home", transparent = false }: NavbarProps) {
  const [user, areas, dict] = await Promise.all([
    getCurrentUser(),
    getAllAreas(),
    getDictionary(),
  ]);

  const links: { id: NonNullable<NavbarProps["active"]>; label: string; href: string }[] = [
    { id: "home", label: dict.nav.home, href: "/" },
    { id: "listings", label: dict.nav.findRoom, href: "/listings" },
    { id: "areas", label: dict.nav.areas, href: "/areas" },
    { id: "universities", label: dict.nav.universities, href: "/universities" },
    { id: "essentials", label: dict.nav.essentials, href: "/essentials" },
    { id: "help", label: dict.nav.help, href: "/help" },
    { id: "admin", label: dict.nav.admin, href: "/admin/agents" },
  ];

  const visibleLinks = links.filter((l) => l.id !== "admin" || user?.isAdmin);

  return (
    <header className={`topnav${transparent ? " transparent" : ""}`}>
      <div className="topnav-inner">
        <MobileMenu links={visibleLinks} active={active} signedIn={!!user} />
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <LogoMark />
          <span>nook</span>
        </Link>
        <nav className="nav-links">
          {visibleLinks.map((l) => (
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
          <LanguageSwitcher variant="menu" />
          {user ? (
            <AccountMenu
              displayName={user.displayName}
              agentStatus={user.agentStatus}
            />
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                {dict.common.signIn}
              </Link>
              <Link href="/agents/register" className="btn btn-secondary btn-sm">
                {dict.common.listProperty}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
