import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { notFound } = await getDictionary();
  return { title: notFound.title };
}

// Root 404: catches unmatched URLs and every notFound() thrown by pages
// (bad listing slug, hidden university, ...). Keeps the navbar so the dead
// end still has all the exits; layout mirrors the coming-soon stub.
export default async function NotFound() {
  const dict = await getDictionary();
  const t = dict.notFound;
  return (
    <>
      <Navbar />
      <main className="coming-soon">
        <span className="kicker">{t.kicker}</span>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
        <div className="stub-actions">
          <Link href="/listings" className="btn btn-primary">
            {t.browseRooms}
          </Link>
          <Link href="/" className="btn btn-secondary">
            <Icon name="arrow-left" size={14} strokeWidth={1.7} className="rtl-flip" />
            {t.backHome}
          </Link>
        </div>
      </main>
    </>
  );
}
