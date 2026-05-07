import Link from "next/link";
import { Icon } from "./icon";
import { NavSearchTrigger } from "./nav-search-trigger";

interface NavbarProps {
  active?: "home" | "listings" | "areas" | "universities" | "help";
  transparent?: boolean;
}

const LINKS: { id: NonNullable<NavbarProps["active"]>; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "listings", label: "Find a room", href: "/listings" },
  { id: "areas", label: "Areas", href: "/areas" },
  { id: "universities", label: "Universities", href: "/universities" },
  { id: "help", label: "Help", href: "/help" },
];

export function Navbar({ active = "home", transparent = false }: NavbarProps) {
  return (
    <header className={`topnav${transparent ? " transparent" : ""}`}>
      <div className="topnav-inner">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <span className="logo-mark">N</span>
          <span>nook</span>
        </Link>
        <nav className="nav-links">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={`nav-link ${active === l.id ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <NavSearchTrigger />
        <div className="nav-right">
          <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} type="button">
            <Icon name="globe" size={14} /> EN
          </button>
          <Link href="/signin" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/list-property" className="btn btn-secondary btn-sm">
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}
