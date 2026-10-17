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
// forced 140vh just left a screen of empty scroll after every section.
//
// The particle-space column no longer draws anything itself - it's a pure
// screen-space marker. The single global <ParticleSystem/> (mounted once in
// the root layout) reads this element's rect every frame and converges its
// shared swarm into it when this section is dominant. That's what lets the
// same particles travel freely between sections instead of each section
// owning an isolated cloud.
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
      <div className="mx-auto flex max-w-6xl items-center md:min-h-[160vh]">
        <div className="grid w-full gap-12 md:grid-cols-3">
          <div
            className={`relative z-[6] ${reverse ? "md:order-2 md:col-span-2" : "md:col-span-2"}`}
          >
            {children}
          </div>
          <div
            ref={targetRef}
            className={`relative min-h-[200px] md:min-h-[280px] ${reverse ? "md:order-1" : ""}`}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
