"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/nook/icon";
import { LogoMark } from "@/components/nook/logo";
import { useDict } from "@/lib/i18n/context";

interface MobileMenuLink {
  id: string;
  label: string;
  href: string;
}

interface MobileMenuProps {
  links: MobileMenuLink[];
  active: string;
  signedIn: boolean;
}

export function MobileMenu({ links, active, signedIn }: MobileMenuProps) {
  const dict = useDict();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-menu-trigger"
        onClick={() => setOpen(true)}
        aria-label={dict.nav.openMenu}
        aria-expanded={open}
      >
        <Icon name="menu" size={20} />
      </button>

      {open && (
        <div
          className="mobile-nav-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="mobile-nav-panel" role="dialog" aria-label={dict.nav.menu}>
            <div className="mobile-nav-head">
              <Link
                href="/"
                className="logo"
                style={{ textDecoration: "none" }}
                onClick={() => setOpen(false)}
              >
                <LogoMark />
                <span>nook</span>
              </Link>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => setOpen(false)}
                aria-label={dict.common.close}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <nav className="mobile-nav-list">
              {links.map((l) => (
                <Link
                  key={l.id}
                  href={l.href}
                  className={`mobile-nav-link ${active === l.id ? "active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {!signedIn && (
              <div className="mobile-nav-foot">
                <Link
                  href="/login"
                  className="btn btn-secondary btn-block"
                  onClick={() => setOpen(false)}
                >
                  {dict.common.signIn}
                </Link>
                <Link
                  href="/agents/register"
                  className="btn btn-primary btn-block"
                  onClick={() => setOpen(false)}
                >
                  {dict.common.listProperty}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
