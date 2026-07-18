"use client";

import { useEffect, useState } from "react";

// Single source of truth for the reduced-motion contract (PRD Section 7.5).
// Every animated system (GSAP section reveal, MagneticHover, future particle
// field / 3D viz) reads this instead of each rolling its own matchMedia check.
export function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(query.matches);

    const listener = (event: MediaQueryListEvent) =>
      setPrefersReduced(event.matches);

    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}
