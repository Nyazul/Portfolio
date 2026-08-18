"use client";

import { useEffect, useState } from "react";

// Scroll-spy for the nav's active-link indicator. One IntersectionObserver
// shared across all section ids rather than one per link - cheap even for
// a handful of sections, and there's exactly one place to reason about
// "what counts as the current section" instead of N independent guesses.
//
// `ids` should be a stable reference (module-level array, not an inline
// literal) - it's an effect dependency, and a fresh array every render
// would tear down and rebuild the observer on every render for no reason.
export function useActiveSection(ids: string[]): string {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Among sections currently intersecting the "active band", pick the
        // one closest to the top of the viewport. Prevents flicker when two
        // adjacent sections are both partially visible during a fast scroll
        // or a long section that never fully leaves the band.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Active band = middle ~10% of the viewport. A section becomes
        // "current" once its top crosses that band, and stays current
        // until the next section's top reaches it.
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
