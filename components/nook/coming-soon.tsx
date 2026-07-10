import Link from "next/link";
import { Icon } from "@/components/nook/icon";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// Honest stub for pages that exist in the footer but aren't written yet
// (/about, /terms, /privacy). One shared shell so the three routes stay
// consistent and get replaced together when the real copy lands.
export function ComingSoon({ dict, title }: { dict: Dictionary; title: string }) {
  const c = dict.comingSoon;
  return (
    <main className="coming-soon">
      <span className="kicker">{c.kicker}</span>
      <h1>{title}</h1>
      <p>{c.body}</p>
      <Link href="/" className="btn btn-secondary">
        <Icon name="arrow-left" size={14} strokeWidth={1.7} className="rtl-flip" />
        {c.backHome}
      </Link>
    </main>
  );
}
