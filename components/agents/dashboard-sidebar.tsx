"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";

// Mirrors AdminSidebar (itself forked from account-sidebar, Q5): reuses the
// .account-sidebar / .account-nav* structural CSS primitives, zero new sidebar
// CSS. The NAV array stays so adding dashboard sections later is a one-line
// change. "New listing" is a nav item here (not in the navbar, LC-18).
interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Exact-match only (default false → active on any deeper path). */
  exact?: boolean;
}

// Dashboard-scoped sections.
const DASHBOARD_NAV: NavItem[] = [
  { href: "/agents/dashboard", label: "My listings", icon: "list", exact: true },
  { href: "/agents/dashboard/listings/new", label: "New listing", icon: "bookmark", exact: true },
];

// Account-scoped sections, the same set the account sidebar shows, so an agent
// on the dashboard is never siloed and can reach every option in one click.
const ACCOUNT_NAV: NavItem[] = [
  { href: "/account", label: "Overview", icon: "grid", exact: true },
  { href: "/account/profile", label: "Profile", icon: "user" },
  { href: "/account/saved", label: "Saved listings", icon: "heart" },
  { href: "/account/recent", label: "Recent", icon: "calendar" },
  { href: "/account/searches", label: "Saved searches", icon: "search" },
];

interface DashboardSidebarProps {
  displayName: string;
  email: string;
  agencyName?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function renderNavItem(item: NavItem, pathname: string) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <li key={item.href}>
      <Link
        href={item.href}
        className={`account-nav-item${active ? " active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon name={item.icon} size={16} />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

export function DashboardSidebar({
  displayName,
  email,
  agencyName,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="account-sidebar" aria-label="Agent dashboard navigation">
      <header className="account-sidebar-head">
        <span className="account-sidebar-avatar" aria-hidden="true">
          {initials(displayName)}
        </span>
        <div className="account-sidebar-id">
          <div className="account-sidebar-name">{displayName}</div>
          <div className="account-sidebar-email" title={email}>
            {email}
          </div>
          <div className="account-sidebar-role">
            Agent{agencyName ? ` · ${agencyName}` : ""}
          </div>
        </div>
      </header>
      <ul className="account-nav">
        <li className="account-nav-label" aria-hidden="true">
          Dashboard
        </li>
        {DASHBOARD_NAV.map((item) => renderNavItem(item, pathname))}

        <li className="account-nav-divider" aria-hidden="true" />
        <li className="account-nav-label" aria-hidden="true">
          Account
        </li>
        {ACCOUNT_NAV.map((item) => renderNavItem(item, pathname))}

        <li className="account-nav-divider" aria-hidden="true" />
        <li>
          <form action={signOutAction}>
            <button
              type="submit"
              className="account-nav-item account-nav-item-danger"
            >
              <Icon name="log-out" size={16} />
              <span>Sign out</span>
            </button>
          </form>
        </li>
      </ul>
    </aside>
  );
}
