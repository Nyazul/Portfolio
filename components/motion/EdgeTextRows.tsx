"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// Each row: [big word, connector, big word].
type Row = [string, string, string];

const ROWS: Row[] = [
  ["BACKEND", "&", "SYSTEMS"],
  ["EVENTS", "&", "CONCURRENCY"],
];

// Oversized rows that travel across the screen in opposite directions as
// the section scrolls past: the first enters from the right edge and leaves
// through the left, the second the reverse. Scroll-scrubbed (not timed), so
// each row sits exactly centered when the section is centered in the
// viewport and reverses when scrolling back up. Transform-only, so it stays
// on the compositor. Reduced motion: both rows static and centered.
export function EdgeTextRows() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  return (
    <section
      ref={sectionRef}
      aria-label={ROWS.map((r) => r.join(" ")).join(", ")}
      className="relative flex min-h-[90svh] items-center overflow-hidden bg-bg py-24"
    >
      {/* Edge fades so words dissolve into the screen edges rather than
          being cut off by them. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-[7] w-[10vw] min-w-12 bg-gradient-to-r from-bg to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-[7] w-[10vw] min-w-12 bg-gradient-to-l from-bg to-transparent" />
      <div className="relative z-[6] flex w-full flex-col gap-[clamp(40px,8vw,112px)]" aria-hidden="true">
        {ROWS.map((row, i) => (
          <EdgeRow
            key={row.join("-")}
            row={row}
            progress={scrollYProgress}
            fromRight={i % 2 === 0}
            still={prefersReducedMotion}
          />
        ))}
      </div>
    </section>
  );
}

function EdgeRow({
  row,
  progress,
  fromRight,
  still,
}: {
  row: Row;
  progress: MotionValue<number>;
  fromRight: boolean;
  still: boolean;
}) {
  // Start fully past one screen edge, end fully past the other. Written as
  // calc(vw, %) - a translate percentage is the row's own width - so it
  // needs no measuring, renders the same on the server, and survives
  // resizes. At progress 0.5 both rows land on 50vw - 50%: centered.
  const x = useTransform(progress, (p) =>
    fromRight
      ? `calc(${(1 - p) * 100}vw - ${p * 100}%)`
      : `calc(${p * 100}vw - ${(1 - p) * 100}%)`,
  );

  const [left, joint, right] = row;
  return (
    <motion.div
      className={`flex w-max items-center whitespace-nowrap ${still ? "mx-auto" : "will-change-transform"}`}
      style={still ? undefined : { x }}
    >
      <span className="text-[clamp(4.5rem,13vw,13rem)] leading-[0.9] font-semibold tracking-tight text-text-primary">
        {left}
      </span>
      <span className="mx-[clamp(20px,4vw,56px)] text-[clamp(2.25rem,6vw,5rem)] leading-[0.9] text-accent">
        {joint}
      </span>
      <span className="text-[clamp(4.5rem,13vw,13rem)] leading-[0.9] font-semibold tracking-tight text-text-primary">
        {right}
      </span>
    </motion.div>
  );
}
