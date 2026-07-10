import { CountUp } from "@/components/motion/count-up";
import { getHomeCounts } from "@/lib/data/home-stats";
import { getDictionary } from "@/lib/i18n/server";

// Live counts, not marketing claims (compute-don't-claim): rooms live right
// now, BOVAEP-verified agents, campuses covered — all derived from the DB.
export async function StatsStrip() {
  const [labels, counts] = await Promise.all([
    getDictionary().then((d) => d.home.statLabels),
    getHomeCounts(),
  ]);
  const stats = [
    { value: String(counts.roomsLive), label: labels[0] },
    { value: String(counts.verifiedAgents), label: labels[1] },
    { value: String(counts.campuses), label: labels[2] },
  ];
  return (
    <div className="stats-strip">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <div className="v">
            <CountUp value={s.value} />
          </div>
          <div className="l">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
