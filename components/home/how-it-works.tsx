"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { spring } from "@/lib/motion";

interface Step {
  num: string;
  label: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    label: "Search",
    title: "Filter by your university",
    body: "Pick your campus, your budget, your move-in date. Sort by walking distance, KTM stops, or rent. Map view shows you everything at once.",
  },
  {
    num: "02",
    label: "Connect",
    title: "Message the agent on WhatsApp",
    body: "One tap to a verified, BOVAEP-licensed agent. No phone-number harvesting, no fake landlords. Most agents reply within 4 hours.",
  },
  {
    num: "03",
    label: "Move in",
    title: "View, sign, settle in",
    body: "Schedule a viewing, sign your tenancy agreement, then leave a review for future students. Average time from enquiry to keys: 38 hours.",
  },
];

export function HowItWorks() {
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
            <h2>How Nook works</h2>
            <div className="sub">
              Made for students. Built around how rooms actually get rented in
              Malaysia.
            </div>
          </div>
          <ol className="hiw-timeline" ref={ref}>
            <motion.span
              className="hiw-rule"
              aria-hidden="true"
              initial={reduceMotion ? false : { scaleY: 0 }}
              animate={shown ? { scaleY: 1 } : undefined}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
            {STEPS.map((s, i) => (
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
