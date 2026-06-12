"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

interface CountUpProps {
  /** Display value, e.g. "12,400+", "RM 0", "4.7 ★", "38h". */
  value: string;
}

const NUMERIC = /^([^\d]*)([\d.,]+)(.*)$/;

// Counts the numeric part of a stat up from 0 when it scrolls into view.
// Prefix/suffix ("RM ", "+", "h", " ★") render verbatim. Non-numeric values
// and reduced-motion fall through to plain text.
export function CountUp({ value }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  const match = value.match(NUMERIC);
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const animatable = match !== null && Number.isFinite(target) && target > 0;
  const decimals = match && match[2].includes(".") ? 1 : 0;

  const [display, setDisplay] = useState(animatable ? "0" : value);

  // Fallback: if the IntersectionObserver never fires, run the count anyway
  // after a tick so the stat can't get stranded at "0".
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForced(true), 800);
    return () => clearTimeout(t);
  }, []);
  const trigger = inView || forced;

  useEffect(() => {
    if (!animatable || !trigger || reduceMotion) return;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) =>
        setDisplay(
          v.toLocaleString("en-MY", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
        ),
    });
    return () => controls.stop();
  }, [animatable, trigger, reduceMotion, target, decimals]);

  if (!animatable || reduceMotion) return <span ref={ref}>{value}</span>;

  return (
    <span ref={ref}>
      {match![1]}
      {display}
      {match![3]}
    </span>
  );
}
