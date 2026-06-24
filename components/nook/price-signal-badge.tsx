import type { PriceSignal } from "@/lib/data/price-intel";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { format } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/utils";

// The "Fair Price" badge (features.md #1). Renders the computed band — Good deal
// / Around market / Above market — using State-Color (success / neutral ink /
// warning). The caption ("Based on N similar listings · median RM X") is the
// honest basis of the claim; shown as a title on the compact card badge and as
// visible text on the detail page (showCaption).

type PriceSignalDict = Dictionary["priceSignal"];

const BAND_CLASS: Record<PriceSignal["band"], string> = {
  good: "pill-deal-good",
  around: "pill-deal-around",
  above: "pill-deal-above",
};

export function PriceSignalBadge({
  signal,
  t,
  size,
  showCaption = false,
}: {
  signal: PriceSignal;
  t: PriceSignalDict;
  size?: "lg";
  showCaption?: boolean;
}) {
  const caption = format(t.caption, {
    n: signal.n,
    median: formatPrice(signal.median),
  });
  const pill = (
    <span
      className={`pill ${BAND_CLASS[signal.band]}${size === "lg" ? " pill-lg" : ""}`}
      title={caption}
    >
      {t[signal.band]}
    </span>
  );
  if (!showCaption) return pill;
  return (
    <span className="price-signal">
      {pill}
      <span className="price-signal-caption">{caption}</span>
    </span>
  );
}
