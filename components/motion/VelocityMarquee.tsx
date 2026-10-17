"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

type VelocityMarqueeProps = {
  items: string[];
  // Idle drift, in % of one copy's width per second.
  baseVelocity?: number;
  className?: string;
};

// Endless keyword strip that idles slowly and speeds up - and flips
// direction - with scroll velocity. Four copies of the row are rendered and
// the track is wrapped between -25% and -50%, so the seam is never visible.
// Reduced motion: static row, no frame loop work. Offscreen: the frame
// callback returns early, so the strip stops moving (and re-styling) once
// the hero has scrolled away.
export function VelocityMarquee({
  items,
  baseVelocity = -2,
  className,
}: VelocityMarqueeProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef);
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], {
    clamp: false,
  });
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || !inView) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    moveBy += direction.current * moveBy * vf;
    baseX.set(baseX.get() + moveBy);
  });

  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-6">{item}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap ${className ?? ""}`}
      aria-label={items.join(", ")}
      role="marquee"
    >
      <motion.div
        className="flex w-max"
        style={prefersReducedMotion ? undefined : { x }}
        aria-hidden="true"
      >
        {row}
        {row}
        {row}
        {row}
      </motion.div>
    </div>
  );
}
