import { Icon, type IconName } from "@/components/nook/icon";

interface Step {
  num: string;
  iconName: IconName;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: "01 — Search",
    iconName: "search",
    title: "Filter by your university",
    body: "Pick your campus, your budget, your move-in date. Sort by walking distance, KTM stops, or rent. Map view shows you everything at once.",
  },
  {
    num: "02 — Connect",
    iconName: "chat",
    title: "Message the agent on WhatsApp",
    body: "One tap to a verified, BOVAEP-licensed agent. No phone-number harvesting, no fake landlords. Most agents reply within 4 hours.",
  },
  {
    num: "03 — Move in",
    iconName: "check",
    title: "View, sign, settle in",
    body: "Schedule a viewing, sign your tenancy agreement, then leave a review for future students. Average time from enquiry to keys: 38 hours.",
  },
];

export function HowItWorks() {
  return (
    <section className="hiw">
      <div className="home-container">
        <div className="home-sec-head" style={{ marginBottom: 32 }}>
          <div>
            <h2>How Nook works</h2>
            <div className="sub">Made for students. Built around how rooms actually get rented in Malaysia.</div>
          </div>
        </div>
        <div className="hiw-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="hiw-step">
              <div className="icon-box">
                <Icon name={s.iconName} size={22} strokeWidth={1.8} />
              </div>
              <div className="hiw-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
