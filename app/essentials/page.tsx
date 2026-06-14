import type { Metadata } from "next";
import { Navbar } from "@/components/nook/navbar";
import { Icon } from "@/components/nook/icon";
import { ESSENTIALS, type EssentialPlace } from "@/lib/seed/essentials";

export const metadata: Metadata = {
  title: "Essentials · Nook",
  description:
    "The off-campus survival kit for Klang Valley students, where to furnish a room, buy clothes, eat for under RM25 a day, get around, sort a SIM, and stay safe. Every link goes straight to the source.",
};

// Curated, static page: no user input, no dynamic fetch. Outbound links are
// hardened, only http(s) hrefs render, every one carries rel="noopener
// noreferrer" so the target can't reach back through window.opener.
function isSafeHref(href: string): boolean {
  return /^https:\/\//i.test(href);
}

// A trust label for the link destination: the bare host, or "Google Maps" for
// map deep-links. Parsed defensively, a malformed href falls back to "Open".
function linkHost(href: string): string {
  try {
    const u = new URL(href);
    if (u.hostname.endsWith("google.com") && u.pathname.startsWith("/maps")) {
      return "Google Maps";
    }
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Open";
  }
}

const num = (i: number) => String(i + 1).padStart(2, "0");

function PlaceCard({ place }: { place: EssentialPlace }) {
  const safe = isSafeHref(place.href);
  const host = linkHost(place.href);

  const inner = (
    <>
      <div className="ess-card-top">
        <h3>{place.name}</h3>
        {place.tag && <span className="ess-tag">{place.tag}</span>}
      </div>
      <p className="ess-what">{place.what}</p>
      <div className="ess-meta">
        {place.price && <span className="ess-price">{place.price}</span>}
        {place.where && (
          <span className="ess-where">
            <Icon name="pin" size={12} />
            {place.where}
          </span>
        )}
      </div>
      <div className="ess-go">
        <span className="ess-host">{host}</span>
        <span className="ess-go-cta" aria-hidden="true">
          Visit <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </>
  );

  // Non-https entries (none ship today) degrade to a non-interactive card
  // rather than rendering an unvetted link.
  if (!safe) return <li className="ess-card ess-card-static">{inner}</li>;

  return (
    <li className="ess-card">
      <a
        href={place.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${place.name}, opens ${host} in a new tab`}
      >
        {inner}
      </a>
    </li>
  );
}

export default function EssentialsPage() {
  const placeCount = ESSENTIALS.reduce((n, c) => n + c.places.length, 0);

  return (
    <>
      <Navbar active="essentials" />

      <div className="container ess">
        <header className="ess-head">
          <div>
            <div className="kicker">Student life</div>
            <h1>
              Set up life off
              <br />
              campus, for less.
            </h1>
          </div>
          <p className="dek">
            The bits no one hands you a guide for, where to furnish a room,
            kit out a kitchen, eat for under RM25 a day, get a SIM, and find a
            clinic at 2am. {ESSENTIALS.length} guides, {placeCount} places,
            every link straight to the source.
          </p>
        </header>

        {/* Jump nav, anchors, no JavaScript. Lets a reader land on what they
            came for in one tap. */}
        <nav className="ess-jump" aria-label="Jump to a guide">
          {ESSENTIALS.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="ess-jump-link">
              <Icon name={c.icon} size={14} />
              {c.title}
            </a>
          ))}
        </nav>

        {ESSENTIALS.map((cat, i) => (
          <section
            key={cat.id}
            id={cat.id}
            className="ess-cat"
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="ess-cat-head">
              <span className="ess-cat-num" aria-hidden="true">
                {num(i)}
              </span>
              <div className="ess-cat-intro">
                <div className="kicker">{cat.kicker}</div>
                <h2>
                  <span className="ess-cat-ico" aria-hidden="true">
                    <Icon name={cat.icon} size={18} />
                  </span>
                  {cat.title}
                </h2>
                <p>{cat.blurb}</p>
              </div>
            </div>
            <ul className="ess-grid">
              {cat.places.map((place) => (
                <PlaceCard key={place.name} place={place} />
              ))}
            </ul>
          </section>
        ))}

        <p className="ess-note">
          A starting point, not a guarantee. Prices, hours and offers change,
          so check before you travel. Spotted something out of date or missing?
          Tell us through <a href="/help">Help</a> and we&apos;ll keep it
          honest.
        </p>
      </div>
    </>
  );
}
