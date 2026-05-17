"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { signOutAction } from "@/app/account/actions";

interface AccountMenuProps {
  displayName: string;
}

export function AccountMenu({ displayName }: AccountMenuProps) {
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
        <span className="account-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="account-name">{displayName}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      {open ? (
        <div className="account-menu" role="menu">
          <div className="account-menu-head">
            <div className="account-menu-name">{displayName}</div>
            <div className="account-menu-sub">Signed in</div>
          </div>
          <Link
            href="/account"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="user" size={14} /> Account
          </Link>
          <Link
            href="/account/saved"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="heart" size={14} /> Saved
          </Link>
          <Link
            href="/account/recent"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="calendar" size={14} /> Recent
          </Link>
          <Link
            href="/account/searches"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="search" size={14} /> Saved searches
          </Link>
          <div className="account-menu-divider" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="account-menu-item account-menu-item-danger"
              role="menuitem"
            >
              <Icon name="log-out" size={14} /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
