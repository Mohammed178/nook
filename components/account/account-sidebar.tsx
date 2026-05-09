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
  {
    href: "/account/saved",
    label: "Saved listings",
    icon: "heart",
    ready: false,
    comingIn: "Phase 3a · Checkpoint E",
  },
  {
    href: "/account/recent",
    label: "Recent",
    icon: "calendar",
    ready: false,
    comingIn: "Phase 3a · Checkpoint F",
  },
  {
    href: "/account/searches",
    label: "Saved searches",
    icon: "search",
    ready: false,
    comingIn: "Phase 3a · Checkpoint G",
  },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="account-sidebar" aria-label="Account navigation">
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
