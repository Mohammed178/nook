import type { Transition } from "motion/react";

// Single source of spring physics for the app. No linear easing on
// interactive or entry motion — springs only (see redesign step 2).
export const spring: Transition = { type: "spring", stiffness: 100, damping: 20 };

// Tighter spring for small UI (pins, hearts, chips) where the soft spring
// reads as lag at sub-40px travel.
export const springSnappy: Transition = { type: "spring", stiffness: 300, damping: 30 };

// Standard entry pose for cards/sections: rise + fade.
export const riseIn = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
} as const;

/**
 * Per-item waterfall delay. Capped so a 50-item list doesn't keep the last
 * rows invisible for seconds — everything past the cap lands together.
 */
export function staggerDelay(index: number, step = 0.04, cap = 0.4): number {
  return Math.min(index * step, cap);
}
