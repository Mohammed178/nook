import { CountUp } from "@/components/motion/count-up";
import { HOME_STATS } from "@/lib/home-content";
import { getDictionary } from "@/lib/i18n/server";

export async function StatsStrip() {
  const labels = (await getDictionary()).home.statLabels;
  return (
    <div className="stats-strip">
      {HOME_STATS.map((s, i) => (
        <div key={s.label} className="stat">
          <div className="v">
            <CountUp value={s.value} />
          </div>
          <div className="l">{labels[i] ?? s.label}</div>
        </div>
      ))}
    </div>
  );
}
