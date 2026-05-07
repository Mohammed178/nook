import { Icon, type IconName } from "@/components/nook/icon";

interface TrustItem {
  iconName: IconName;
  title: string;
  body: string;
}

const ITEMS: TrustItem[] = [
  {
    iconName: "check",
    title: "Verified agents",
    body: "REN/PEA licences cross-checked with the BOVAEP registry. Every agent's profile carries a verification badge.",
  },
  {
    iconName: "camera",
    title: "Real photos",
    body: "Agents must upload at least 5 photos. Auto-detection flags listings that re-use photos from elsewhere.",
  },
  {
    iconName: "star",
    title: "Reviews from real tenants",
    body: "Only students who completed a tenancy can review. Agents reply on the public profile — no shadow-deletes.",
  },
  {
    iconName: "shield",
    title: "Trust & safety team",
    body: "Reports reviewed within 48 hours. Suspicious listings are auto-flagged for moderation before they go live.",
  },
];

export function TrustStrip() {
  return (
    <section className="home-container">
      <div className="home-sec-head center">
        <div>
          <h2>Built for students, not for clicks.</h2>
          <div className="sub">Every agent on Nook is verified. Every room is real. Every review is from someone who actually stayed.</div>
        </div>
      </div>
      <div className="trust-grid">
        {ITEMS.map((it) => (
          <div key={it.title} className="trust-cell">
            <div className="trust-icon">
              <Icon name={it.iconName} size={18} strokeWidth={1.8} />
            </div>
            <div>
              <div className="t">{it.title}</div>
              <div className="d">{it.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
