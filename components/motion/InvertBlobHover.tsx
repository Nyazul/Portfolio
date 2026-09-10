"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useMotionTemplate,
  useSpring,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type InvertBlobHoverProps = {
  children: React.ReactNode;
  className?: string;
  // Blob diameter in px - sized relative to the text it's meant to cover.
  size?: number;
};

// Asymmetric border-radius values the blob cycles through on a loop while
// hovered, so its outline keeps wobbling like a liquid mass instead of
// sitting still as a plain circle. Each entry has the same structure (four
// corner percentages / four more), which is what lets Motion interpolate
// smoothly between them rather than snapping.
const BLOB_SHAPES = [
  "62% 38% 55% 45% / 45% 60% 40% 55%",
  "40% 60% 65% 35% / 55% 40% 60% 45%",
  "55% 45% 40% 60% / 60% 45% 55% 40%",
  "45% 55% 60% 40% / 40% 55% 45% 60%",
  "62% 38% 55% 45% / 45% 60% 40% 55%",
];

// Cursor-following blob that inverts whatever text it passes over, via
// mix-blend-mode: difference (inspired by noth.in's hero hover, which uses
// video footage inside the blob). We have no footage to drop in, so a solid
// --color-inverse-bg fill against --color-text-primary text produces the
// same "the cursor punches an inverted hole in the text" read without any
// asset - difference(F5F5F5, F5F5F5) lands at black, which is effectively
// --color-inverse-text already.
//
// IMPORTANT: this stays a single motion.div, sitting as a direct sibling
// of the text it's inverting. mix-blend-mode only composites against
// content painted within the same stacking context - wrapping the blend
// element in its own transformed parent (an earlier version of this did
// exactly that, to get rotation working) silently cuts it off from the
// real backdrop, so it just renders as a flat, unblended fill instead of
// inverting anything.
export function InvertBlobHover({
  children,
  className,
  size = 220,
}: InvertBlobHoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 420, damping: 32, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 420, damping: 32, mass: 0.4 });

  // Separate 0-1 value for the hover-triggered spread-in/out.
  const hoverScale = useMotionValue(0);

  const transform = useMotionTemplate`translate(${springX}px, ${springY}px) scale(${hoverScale})`;

  useEffect(() => {
    const controls = animate(hoverScale, hovered ? 1 : 0, {
      type: "spring",
      stiffness: 280,
      damping: hovered ? 20 : 26,
    });
    return () => controls.stop();
  }, [hovered, hoverScale]);

  if (prefersReducedMotion) {
    // No invert blob at all - matches MagneticHover's reduced-motion
    // contract (effect absent, not a toned-down version of it).
    return <div className={className}>{children}</div>;
  }

  function track(e: React.MouseEvent<HTMLDivElement>) {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    x.set(e.clientX - bounds.left - size / 2);
    y.set(e.clientY - bounds.top - size / 2);
  }

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onMouseEnter={(e) => {
        track(e);
        setHovered(true);
      }}
      onMouseMove={track}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0"
        style={{
          width: size,
          height: size,
          transform,
          backgroundColor: "var(--color-inverse-bg)",
          mixBlendMode: "difference",
        }}
        animate={{ borderRadius: hovered ? BLOB_SHAPES : BLOB_SHAPES[0] }}
        transition={{
          borderRadius: hovered
            ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.4, ease: "easeOut" },
        }}
      />
    </div>
  );
}
