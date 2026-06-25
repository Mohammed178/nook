"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";
import type { AgentStatus } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface AccountSidebarProps {
  displayName: string;
  email: string;
  avatarUrl?: string;
  agentStatus?: AgentStatus;
  agencyName?: string;
  isAdmin?: boolean;
  dict: Dictionary;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function AccountSidebar({
  displayName,
  email,
  avatarUrl,
  agentStatus,
  agencyName,
  isAdmin,
  dict,
}: AccountSidebarProps) {
  const n = dict.accountNav;
  const NAV: NavItem[] = [
    { href: "/account", label: n.overview, icon: "grid" },
    { href: "/account/profile", label: n.profile, icon: "user" },
    { href: "/account/saved", label: n.savedListings, icon: "heart" },
    { href: "/account/recent", label: n.recent, icon: "calendar" },
    { href: "/account/searches", label: n.savedSearches, icon: "search" },
  ];
  const pathname = usePathname();
  const isApprovedAgent = agentStatus === "approved";
  const isPendingAgent = agentStatus === "pending" || agentStatus === "rejected";

  return (
    <aside className="account-sidebar" aria-label={n.navAria}>
      <header className="account-sidebar-head">
        {avatarUrl ? (
          // Avatar is a public-bucket URL on an arbitrary Supabase host;
          // next/image remote patterns are not configured for it, and this is a
          // small fixed-size image, so a plain <img> is the right call.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="account-sidebar-avatar account-sidebar-avatar-img"
            src={avatarUrl}
            alt=""
          />
        ) : (
          <span className="account-sidebar-avatar" aria-hidden="true">
            {initials(displayName)}
          </span>
        )}
        <div className="account-sidebar-id">
          <div className="account-sidebar-name">{displayName}</div>
          <div className="account-sidebar-email" title={email}>
            {email}
          </div>
          {isApprovedAgent ? (
            <div className="account-sidebar-role">
              {n.agent}{agencyName ? ` · ${agencyName}` : ""}
            </div>
          ) : isPendingAgent ? (
            <div className="account-sidebar-role">
              {agentStatus === "rejected" ? n.applicationRejected : n.underReview}
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
              <span>{n.agentDashboard}</span>
            </Link>
          </li>
        ) : null}
        {isPendingAgent ? (
          <li>
            <Link
              href="/agents/pending"
              className={`account-nav-item${
                pathname === "/agents/pending" ? " active" : ""
              }`}
              aria-current={pathname === "/agents/pending" ? "page" : undefined}
            >
              <Icon name="shield" size={16} />
              <span>{n.applicationStatus}</span>
            </Link>
          </li>
        ) : null}
        {isAdmin ? (
          <li>
            <Link
              href="/admin/agents"
              className={`account-nav-item${
                pathname.startsWith("/admin/agents") ? " active" : ""
              }`}
              aria-current={
                pathname.startsWith("/admin/agents") ? "page" : undefined
              }
            >
              <Icon name="shield" size={16} />
              <span>{dict.admin.pendingAgents}</span>
            </Link>
          </li>
        ) : null}
        {isAdmin ? (
          <li>
            <Link
              href="/admin/universities"
              className={`account-nav-item${
                pathname.startsWith("/admin/universities") ? " active" : ""
              }`}
              aria-current={
                pathname.startsWith("/admin/universities") ? "page" : undefined
              }
            >
              <Icon name="school" size={16} />
              <span>{dict.admin.uni.nav}</span>
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
              <span>{n.signOut}</span>
            </button>
          </form>
        </li>
      </ul>
    </aside>
  );
}
