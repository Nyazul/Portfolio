"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type MagneticHoverProps = {
  children: React.ReactNode;
  className?: string;
  // How far the element is allowed to travel toward the cursor, in px.
  strength?: number;
};

// Reusable pull-toward-cursor effect (PRD 6.1/7.4, inspired by noth.in).
// Used on nav links and hero CTAs - not a one-off, so it lives in its own
// component rather than being copy-pasted per usage site.
export function MagneticHover({
  children,
  className,
  strength = 16,
}: MagneticHoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  if (prefersReducedMotion) {
    // No pull effect at all - not a "reduced" version of it, absent entirely,
    // matching the reduced-motion contract for every other animated system.
    return <div className={className}>{children}</div>;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    const relX = e.clientX - (bounds.left + bounds.width / 2);
    const relY = e.clientY - (bounds.top + bounds.height / 2);
    x.set((relX / bounds.width) * strength);
    y.set((relY / bounds.height) * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
}
