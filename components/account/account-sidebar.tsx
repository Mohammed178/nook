"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";
import type { AgentStatus } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { href: "/account", label: "Overview", icon: "grid" },
  { href: "/account/profile", label: "Profile", icon: "user" },
  { href: "/account/saved", label: "Saved listings", icon: "heart" },
  { href: "/account/recent", label: "Recent", icon: "calendar" },
  { href: "/account/searches", label: "Saved searches", icon: "search" },
];

interface AccountSidebarProps {
  displayName: string;
  email: string;
  agentStatus?: AgentStatus;
  agencyName?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function AccountSidebar({
  displayName,
  email,
  agentStatus,
  agencyName,
}: AccountSidebarProps) {
  const pathname = usePathname();
  const isApprovedAgent = agentStatus === "approved";

  return (
    <aside className="account-sidebar" aria-label="Account navigation">
      <header className="account-sidebar-head">
        <span className="account-sidebar-avatar" aria-hidden="true">
          {initials(displayName)}
        </span>
        <div className="account-sidebar-id">
          <div className="account-sidebar-name">{displayName}</div>
          <div className="account-sidebar-email" title={email}>
            {email}
          </div>
          {isApprovedAgent ? (
            <div className="account-sidebar-role">
              Agent{agencyName ? ` · ${agencyName}` : ""}
            </div>
          ) : null}
        </div>
      </header>
      <ul className="account-nav">
        {isApprovedAgent ? (
          <li>
            <Link
              href="/agents/dashboard"
              className={`account-nav-item${
                pathname.startsWith("/agents/dashboard") ? " active" : ""
              }`}
              aria-current={
                pathname.startsWith("/agents/dashboard") ? "page" : undefined
              }
            >
              <Icon name="grid" size={16} />
              <span>Agent dashboard</span>
            </Link>
          </li>
        ) : null}
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/account" && pathname.startsWith(item.href + "/"));
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
