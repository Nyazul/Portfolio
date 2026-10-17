"use client";

import { useParticleTarget } from "@/lib/hooks/use-particle-target";
import type { SectionTheme } from "@/lib/theme-colors";
import type { Point } from "@/lib/particle-shapes";

type SectionSplitProps = {
  id: string;
  theme: SectionTheme;
  shapePoints: Point[];
  reverse?: boolean;
  children: React.ReactNode;
};

// 2:1 content/particle-space column split, alternating side via `reverse`.
// Sections are given real scroll room (min-h) on purpose - enough for the
// particle scatter -> converge -> scatter cycle to actually read as a
// cycle, rather than the shape flashing past in a cramped viewport. Only on
// md+, though: on mobile the particle column stacks under the content, so a
// forced 160vh just left a screen of empty scroll after every section.
//
// The particle-space column draws nothing itself - it's a pure screen-space
// marker. The single global <ParticleSystem/> converges its shared swarm
// into this element's rect when this section is dominant, which is what
// lets the same particles travel freely between sections.
//
// On md+ the marker is a half-viewport box pinned (sticky) to the middle of
// the screen for as long as its section is on screen. Before, it stretched
// to the content's full height, so in a long section the shape formed
// around the section's midpoint - often off-screen while you read the top -
// and its size depended on how much content the section had. Now every
// shape forms in view, at the same size, and holds for the whole section.
// (particle-engine.ts computes sticky positions itself, since it caches
// rects relative to the document.)
export function SectionSplit({
  id,
  theme,
  shapePoints,
  reverse,
  children,
}: SectionSplitProps) {
  const targetRef = useParticleTarget(id, theme, shapePoints);

  return (
    <section id={id} className="section-pad px-6">
      <div className="mx-auto grid max-w-6xl gap-12 md:min-h-[160vh] md:grid-cols-3">
        <div
          className={`relative z-[6] md:self-center ${reverse ? "md:order-2 md:col-span-2" : "md:col-span-2"}`}
        >
          {children}
        </div>
        <div
          ref={targetRef}
          className={`relative min-h-[200px] md:sticky md:top-[25svh] md:h-[50svh] md:min-h-0 md:self-start ${reverse ? "md:order-1" : ""}`}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
