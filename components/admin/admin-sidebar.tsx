"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";
import { useDict } from "@/lib/i18n/context";

// Forked from account-sidebar (Q5): account-sidebar hardcodes the /account NAV
// and is not parameterised. This reuses the .account-sidebar / .account-nav*
// CSS classes (structural vertical-nav primitives), zero new sidebar CSS.
// MVP NAV is a single item; the array stays so adding admin sections later is a
// one-line change.
interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface AdminSidebarProps {
  displayName: string;
  email: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function AdminSidebar({ displayName, email }: AdminSidebarProps) {
  const dict = useDict();
  const a = dict.admin;
  const pathname = usePathname();

  const NAV: NavItem[] = [
    { href: "/admin/agents", label: a.pendingAgents, icon: "shield" },
  ];

  return (
    <aside className="account-sidebar" aria-label={a.navAria}>
      <header className="account-sidebar-head">
        <span className="account-sidebar-avatar" aria-hidden="true">
          {initials(displayName)}
        </span>
        <div className="account-sidebar-id">
          <div className="account-sidebar-name">{displayName}</div>
          <div className="account-sidebar-email" title={email}>
            {email}
          </div>
          <div className="account-sidebar-role">{a.role}</div>
        </div>
      </header>
      <ul className="account-nav">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
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
              <span>{dict.accountNav.signOut}</span>
            </button>
          </form>
        </li>
      </ul>
    </aside>
  );
}
