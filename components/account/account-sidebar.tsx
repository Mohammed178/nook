"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  ready: boolean;
  comingIn?: string;
}

const NAV: NavItem[] = [
  { href: "/account/profile", label: "Profile", icon: "user", ready: true },
  { href: "/account/saved", label: "Saved listings", icon: "heart", ready: true },
  { href: "/account/recent", label: "Recent", icon: "calendar", ready: true },
  { href: "/account/searches", label: "Saved searches", icon: "search", ready: true },
];

interface AccountSidebarProps {
  displayName: string;
  email: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function AccountSidebar({ displayName, email }: AccountSidebarProps) {
  const pathname = usePathname();

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
        </div>
      </header>
      <ul className="account-nav">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/account" && pathname.startsWith(item.href + "/"));
          if (!item.ready) {
            return (
              <li key={item.href}>
                <button
                  type="button"
                  className="account-nav-item disabled"
                  disabled
                  title={`Coming soon — ${item.comingIn}`}
                  aria-disabled="true"
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  <span className="account-nav-soon">Soon</span>
                </button>
              </li>
            );
          }
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
