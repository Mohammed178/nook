"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";

// Mirrors AdminSidebar (itself forked from account-sidebar, Q5): reuses the
// .account-sidebar / .account-nav* structural CSS primitives — zero new sidebar
// CSS. The NAV array stays so adding dashboard sections later is a one-line
// change. "New listing" is a nav item here (not in the navbar — LC-18).
interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { href: "/agents/dashboard", label: "My listings", icon: "list" },
  { href: "/agents/dashboard/listings/new", label: "New listing", icon: "bookmark" },
];

interface DashboardSidebarProps {
  displayName: string;
  email: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function DashboardSidebar({ displayName, email }: DashboardSidebarProps) {
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
        </div>
      </header>
      <ul className="account-nav">
        {NAV.map((item) => {
          // Exact match only: "My listings" must not stay active on the New
          // listing route (which is a deeper path under /agents/dashboard).
          const active = pathname === item.href;
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
        })}
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
