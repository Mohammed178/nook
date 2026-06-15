"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";
import { useDict } from "@/lib/i18n/context";

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
  const dict = useDict();
  const t = dict.agents;
  const n = dict.accountNav;
  const pathname = usePathname();

  const DASHBOARD_NAV: NavItem[] = [
    { href: "/agents/dashboard", label: t.myListings, icon: "list", exact: true },
    { href: "/agents/dashboard/listings/new", label: t.newListing, icon: "bookmark", exact: true },
  ];

  const ACCOUNT_NAV: NavItem[] = [
    { href: "/account", label: n.overview, icon: "grid", exact: true },
    { href: "/account/profile", label: n.profile, icon: "user" },
    { href: "/account/saved", label: n.savedListings, icon: "heart" },
    { href: "/account/recent", label: n.recent, icon: "calendar" },
    { href: "/account/searches", label: n.savedSearches, icon: "search" },
  ];

  return (
    <aside className="account-sidebar" aria-label={t.dashboardNavAria}>
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
            {n.agent}{agencyName ? ` · ${agencyName}` : ""}
          </div>
        </div>
      </header>
      <ul className="account-nav">
        <li className="account-nav-label" aria-hidden="true">
          {t.dashboardLabel}
        </li>
        {DASHBOARD_NAV.map((item) => renderNavItem(item, pathname))}

        <li className="account-nav-divider" aria-hidden="true" />
        <li className="account-nav-label" aria-hidden="true">
          {t.accountLabel}
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
              <span>{n.signOut}</span>
            </button>
          </form>
        </li>
      </ul>
    </aside>
  );
}
