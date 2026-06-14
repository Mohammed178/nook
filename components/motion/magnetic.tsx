"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

interface MagneticProps {
  children: ReactNode;
  /** Fraction of the cursor offset the element follows (0–1). */
  strength?: number;
}

// Magnetic hover: the wrapped element drifts toward the cursor and springs
// back on leave. Motion values only, no React state per pointer move.
export function Magnetic({ children, strength = 0.22 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 24 });
  const sy = useSpring(y, { stiffness: 300, damping: 24 });
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.div>
  );
}
