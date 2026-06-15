"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";
import { useDict } from "@/lib/i18n/context";

export function HowItWorks() {
  const h = useDict().home;
  const steps = h.hiwSteps.map((s, i) => ({
    num: String(i + 1).padStart(2, "0"),
    ...s,
  }));
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  // Reliability gate: reveal on scroll-into-view, but a mount fallback flips
  // it on regardless after a tick, so if the IntersectionObserver never fires
  // (observed in this Next/Turbopack + motion setup), the text never gets
  // stranded at opacity 0.
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForced(true), 600);
    return () => clearTimeout(t);
  }, []);
  const shown = inView || forced;

  return (
    <section className="hiw">
      <div className="home-container">
        <div className="hiw-split">
          <div className="hiw-head">
            <h2>{h.hiwTitle}</h2>
            <div className="sub">{h.hiwSub}</div>
          </div>
          <ol className="hiw-timeline" ref={ref}>
            <motion.span
              className="hiw-rule"
              aria-hidden="true"
              initial={reduceMotion ? false : { scaleY: 0 }}
              animate={shown ? { scaleY: 1 } : undefined}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
            {steps.map((s, i) => (
              <motion.li
                key={s.num}
                className="hiw-item"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={shown ? { opacity: 1, y: 0 } : undefined}
                transition={{ ...spring, delay: i * 0.12 }}
              >
                <span className="hiw-dot" aria-hidden="true">
                  {s.num}
                </span>
                <div className="hiw-num">
                  {s.num}, {s.label}
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
