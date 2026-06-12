import { CountUp } from "@/components/motion/count-up";
import { HOME_STATS } from "@/lib/home-content";

export function StatsStrip() {
  return (
    <div className="stats-strip">
      {HOME_STATS.map((s) => (
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
