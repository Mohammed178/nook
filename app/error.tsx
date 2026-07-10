"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useDict } from "@/lib/i18n/context";

// Root error boundary. Must be a client component (Next.js contract), so the
// async server Navbar can't render here; the layout (and footer) around it
// survives, only the page segment is replaced. reset() re-renders the failed
// segment, which is enough for transient failures (DB hiccup, network).
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useDict().errorPage;

  useEffect(() => {
    // Server-side details are already in the server log; this ties the
    // browser console to the digest Next prints there.
    console.error("[error-boundary]", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="coming-soon">
      <span className="kicker">{t.kicker}</span>
      <h1>{t.title}</h1>
      <p>{t.body}</p>
      <div className="stub-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>
          {t.retry}
        </button>
        <Link href="/" className="btn btn-secondary">
          {t.backHome}
        </Link>
      </div>
    </main>
  );
}
