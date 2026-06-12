"use client";

import { motion, useReducedMotion } from "motion/react";

interface HeroDeckProps {
  photos: [string, string, string];
  pillText: string;
}

// Isolated motion leaf: three stacked photos with a slow vertical float, plus
// a glass status pill. Perpetual loop lives here so the server hero stays
// static; reduced-motion renders the same stack without movement.
const FLOAT = (delay: number) => ({
  y: [0, -9, 0],
  transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const, delay },
});

export function HeroDeck({ photos, pillText }: HeroDeckProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="hero-deck" aria-hidden="true">
      {photos.map((src, i) => (
        <motion.div
          key={src}
          className={`hero-deck-card d${i + 1}`}
          style={{ backgroundImage: `url(${src})` }}
          animate={reduceMotion ? undefined : FLOAT(i * 1.6)}
        />
      ))}
      <motion.div
        className="hero-deck-pill"
        animate={reduceMotion ? undefined : FLOAT(0.8)}
      >
        <span className="dot" />
        {pillText}
      </motion.div>
    </div>
  );
}
