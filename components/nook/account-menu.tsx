"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";
import { useDict } from "@/lib/i18n/context";
import type { AgentStatus } from "@/lib/types";

interface AccountMenuProps {
  displayName: string;
  avatarUrl?: string;
  agentStatus?: AgentStatus;
}

export function AccountMenu({ displayName, avatarUrl, agentStatus }: AccountMenuProps) {
  const m = useDict().accountMenu;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="account-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          // Public-bucket URL on a Supabase host; next/image remote patterns are
          // not set up for it and this is a small fixed-size image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="account-avatar account-avatar-img"
            src={avatarUrl}
            alt=""
          />
        ) : (
          <span className="account-avatar" aria-hidden="true">
            {initial}
          </span>
        )}
        <span className="account-name">{displayName}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open ? (
        <div className="account-menu" role="menu">
          <div className="account-menu-head">
            <div className="account-menu-name">{displayName}</div>
            <div className="account-menu-sub">{m.signedIn}</div>
          </div>
          <Link
            href="/account"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="user" size={14} /> {m.account}
          </Link>
          <Link
            href="/account/saved"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="heart" size={14} /> {m.saved}
          </Link>
          <Link
            href="/account/recent"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="calendar" size={14} /> {m.recent}
          </Link>
          <Link
            href="/account/searches"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="search" size={14} /> {m.savedSearches}
          </Link>
          {agentStatus === "approved" ? (
            <Link
              href="/agents/dashboard"
              className="account-menu-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon name="grid" size={14} /> {m.agentDashboard}
            </Link>
          ) : null}
          {agentStatus === "pending" || agentStatus === "rejected" ? (
            <Link
              href="/agents/pending"
              className="account-menu-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Icon name="shield" size={14} /> {m.applicationStatus}
            </Link>
          ) : null}
          <div className="account-menu-divider" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="account-menu-item account-menu-item-danger"
              role="menuitem"
            >
              <Icon name="log-out" size={14} /> {m.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
