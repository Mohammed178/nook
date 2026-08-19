import { notFound } from "next/navigation";
import { ListingCard } from "@/components/nook/listing-card";
import { Icon } from "@/components/nook/icon";
import { Navbar } from "@/components/nook/navbar";
import { getAllListings } from "@/lib/data/listings";
import { attachListingRelations } from "@/lib/data/listings-relations";
import { getDictionary, getLocale } from "@/lib/i18n/server";

const COLORS: Record<string, [string, string][]> = {
  Brand: [
    ["--brand-500", "#2F4156"],
    ["--brand-600", "#263547"],
    ["--brand-700", "#1C2836"],
    ["--brand-50", "#EDF3F7"],
    ["--brand-100", "#C8D9E6"],
    ["--brand-200", "#9FBCCD"],
  ],
  Accents: [
    ["--accent-olive", "#6B7A3A"],
    ["--accent-blue", "#0068A8"],
    ["--accent-yellow", "#FFB400"],
    ["--accent-green", "#00A86B"],
    ["--whatsapp", "#25D366"],
  ],
  Neutrals: [
    ["--ink-900", "#1B1815"],
    ["--ink-700", "#36312B"],
    ["--ink-500", "#6B645A"],
    ["--ink-400", "#9E978D"],
    ["--ink-300", "#D1CCC4"],
    ["--ink-200", "#E9E5DF"],
    ["--ink-100", "#F7F4EF"],
    ["--ink-50", "#FBFAF7"],
    ["--paper", "#FFFFFF"],
  ],
  Semantic: [
    ["--success", "#00A86B"],
    ["--warning", "#F59E0B"],
    ["--danger", "#DC2626"],
    ["--info", "#0068A8"],
  ],
};

const TYPE: [string, string, string][] = [
  ["xxs", "10px", "eyebrows, meta"],
  ["xs", "12px", "helper, license"],
  ["sm", "13px", "secondary"],
  ["base", "14px", "body, card title"],
  ["md", "16px", "sub-headings"],
  ["lg", "18px", "card price"],
  ["xl", "22px", "page H2"],
  ["2xl", "28px", "page H1"],
  ["3xl", "36px", "hero only"],
];

const RADII: [string, string][] = [
  ["xs", "2px"],
  ["sm", "4px"],
  ["md", "6px"],
  ["lg", "8px"],
];

export default async function DesignSystemPage() {
  // F-P4, dev-only component showcase. 404 in production so it stays off the anon
  // surface (no middleware change needed); reachable in dev. Guard runs BEFORE any
  // data load so prod never even queries.
  if (process.env.NODE_ENV === "production") notFound();

  const listings = await getAllListings();
  const sample = await attachListingRelations(listings.slice(0, 4));
  const sampleH = await attachListingRelations(listings.slice(0, 2));
  const sampleMini = await attachListingRelations(listings.slice(0, 3));
  const [mapSample] = await attachListingRelations([listings[0]]);
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const card = dict.card;
  return (
    <div style={{ background: "var(--ink-50)" }}>
      <Navbar />
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        <h1
          style={{
            fontSize: "var(--t-3xl)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Nook design system
        </h1>
        <p
          style={{
            fontSize: "var(--t-md)",
            color: "var(--ink-500)",
            marginBottom: 32,
            maxWidth: 700,
          }}
        >
          Tokens, components, and patterns. Source of truth, Geist throughout, slate-navy
          brand as primary CTA on a warm-white canvas, modest radii, almost no shadows.
        </p>

        <Section title="Colour" lab="Brand carries CTA. Accents share semantic meaning. Neutrals carry the layout.">
          {Object.entries(COLORS).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 20 }}>
              <Eyebrow>{group}</Eyebrow>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6,1fr)",
                  gap: 12,
                }}
              >
                {items.map(([name, hex]) => (
                  <div
                    key={name}
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <div
                      style={{
                        height: 60,
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--ink-200)",
                        background: hex,
                      }}
                    />
                    <div
                      style={{
                        fontSize: "var(--t-xs)",
                        fontWeight: 700,
                        color: "var(--ink-900)",
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink-500)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {hex}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section
          title="Typography"
          lab="Geist, weights 400 / 500 / 600 / 700. Geist Mono + tabular-nums on prices, license numbers, statistics."
        >
          <div className="panel" style={panelStyle}>
            {TYPE.map(([name, size, use]) => {
              const px = parseInt(size, 10);
              const weight = name === "base" ? 400 : px >= 22 ? 700 : 600;
              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 16,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--ink-100)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      width: 60,
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {name}
                  </span>
                  <span style={{ fontSize: size, fontWeight: weight, color: "var(--ink-900)" }}>
                    RM 1,450, Cosy studio in Bangsar
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--ink-500)",
                      marginLeft: "auto",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {size} · {use}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          title="Buttons"
          lab="Primary brand carries the page. WhatsApp green is sacred, never substitute."
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={panelStyle}>
              <h3 style={panelH3}>Variants</h3>
              <div style={btnRowStyle}>
                <button className="btn btn-primary" type="button">
                  Reveal phone
                </button>
                <button className="btn btn-secondary" type="button">
                  View map
                </button>
                <button className="btn btn-whatsapp" type="button">
                  <Icon name="whatsapp" size={14} />
                  WhatsApp
                </button>
                <button className="btn btn-call" type="button">
                  <Icon name="phone" size={14} />
                  Call
                </button>
                <button className="btn btn-ghost" type="button">
                  Cancel
                </button>
              </div>
            </div>
            <div style={panelStyle}>
              <h3 style={panelH3}>Sizes</h3>
              <div style={btnRowStyle}>
                <button className="btn btn-primary btn-sm" type="button">
                  Small
                </button>
                <button className="btn btn-primary" type="button">
                  Default
                </button>
                <button className="btn btn-primary btn-lg" type="button">
                  Large CTA
                </button>
                <button className="btn btn-icon" type="button" aria-label="Save">
                  <Icon name="heart" size={14} />
                </button>
                <button className="btn btn-icon" type="button" aria-label="Settings">
                  <Icon name="settings" size={14} />
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Pills & badges"
          lab="Status indicators. 11px, semibold, 2px radius. Use sparingly."
        >
          <div style={panelStyle}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span className="pill pill-verified">
                <Icon name="check" size={10} />
                Verified
              </span>
              <span className="pill pill-featured">
                <Icon name="star" size={10} />
                Featured
              </span>
              <span className="pill pill-today">Listed today</span>
            </div>
          </div>
        </Section>

        <Section
          title="Listing card · 4 variants"
          lab="The most-used component. All variants share the same data contract."
        >
          <Eyebrow>Vertical (mobile, homepage, favourites)</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {sample.map(({ listing, agent, area }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                agent={agent}
                area={area}
                card={card}
                locale={locale}
              />
            ))}
          </div>

          <Eyebrow>Horizontal (desktop list view)</Eyebrow>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {sampleH.map(({ listing, agent, area }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                agent={agent}
                area={area}
                card={card}
                locale={locale}
                variant="horizontal"
              />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <Eyebrow>Mini (similar listings rail)</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sampleMini.map(({ listing, agent, area }) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    agent={agent}
                    area={area}
                    card={card}
                    locale={locale}
                    variant="mini"
                  />
                ))}
              </div>
            </div>
            <div>
              <Eyebrow>Map preview popup</Eyebrow>
              <div
                style={{
                  background: "#ECF0E8",
                  borderRadius: "var(--r-md)",
                  padding: 24,
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 100,
                }}
              >
                <ListingCard
                  listing={mapSample.listing}
                  agent={mapSample.agent}
                  area={mapSample.area}
                  card={card}
                  locale={locale}
                  variant="map"
                />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Filter bar"
          lab="Sticky below top nav on /listings. Pills are 4px-radius rectangles."
        >
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--ink-200)",
              borderRadius: "var(--r-md)",
              padding: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span className="filter-pill">
              <Icon name="pin" size={13} />
              Bandar Sunway
            </span>
            <span className="filter-pill">
              Studio <Icon name="chevron-down" size={11} className="caret" />
            </span>
            <span className="filter-pill">
              Up to RM 1,500 <Icon name="chevron-down" size={11} className="caret" />
            </span>
            <span className="filter-pill active">Furnished</span>
            <span className="filter-pill active">Female only</span>
            <span className="filter-pill">
              <Icon name="sliders" size={13} />
              More filters
            </span>
          </div>
        </Section>

        <Section
          title="Map pins"
          lab="Price pins in brand colour, university markers in info-blue, cluster pins for zoomed-out view."
        >
          <div
            style={{
              background: "#ECF0E8",
              borderRadius: "var(--r-md)",
              padding: 24,
              display: "flex",
              gap: 16,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 100,
            }}
          >
            <div className="map-pin">RM 480</div>
            <div className="map-pin selected">RM 720</div>
            <div className="map-pin-cluster">12</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "var(--accent-blue)",
                  border: "2px solid #fff",
                }}
              />
              <span
                style={{
                  background: "rgba(255,255,255,0.95)",
                  padding: "2px 6px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--accent-blue)",
                  border: "1px solid var(--accent-blue)",
                }}
              >
                UM
              </span>
            </div>
          </div>
        </Section>

        <Section
          title="KPI tile"
          lab="Used in agent dashboard + analytics. Brand-coloured number, ink-500 label."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <Kpi label="Active listings" value="24" delta="+3 this week" up />
            <Kpi label="Phone reveals" value="142" delta="+18% vs last week" up />
            <Kpi label="WhatsApp clicks" value="87" delta="−4% vs last week" down />
          </div>
        </Section>

        <Section
          title="Radii & elevation"
          lab="Modest corners. Almost no shadows, borders carry hierarchy."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {RADII.map(([n, v]) => (
              <div key={n} style={{ ...panelStyle, textAlign: "center" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "var(--brand-50)",
                    border: "1px solid var(--brand-200)",
                    borderRadius: v,
                    margin: "0 auto 8px",
                  }}
                />
                <div style={{ fontSize: "var(--t-xs)", fontWeight: 700 }}>--r-{n}</div>
                <div style={{ fontSize: 10, color: "var(--ink-500)" }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--paper)",
  border: "1px solid var(--ink-200)",
  borderRadius: "var(--r-md)",
  padding: 16,
};

const panelH3: React.CSSProperties = {
  fontSize: "var(--t-md)",
  marginBottom: 12,
};

const btnRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

function Section({
  title,
  lab,
  children,
}: {
  title: string;
  lab: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 48,
        paddingTop: 24,
        borderTop: "1px solid var(--ink-200)",
      }}
    >
      <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 700, marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: "var(--t-sm)", color: "var(--ink-500)", marginBottom: 20 }}>{lab}</p>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: "var(--t-sm)",
        textTransform: "uppercase",
        color: "var(--ink-500)",
        marginBottom: 8,
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </h3>
  );
}

function Kpi({
  label,
  value,
  delta,
  up,
  down,
}: {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  down?: boolean;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta ${up ? "up" : down ? "down" : ""}`.trim()}>{delta}</div>
      )}
    </div>
  );
}
