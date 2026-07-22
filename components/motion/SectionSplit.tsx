import { SectionParticles } from "@/components/motion/SectionParticles";
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
// cycle, rather than the shape flashing past in a cramped viewport.
export function SectionSplit({
  id,
  theme,
  shapePoints,
  reverse,
  children,
}: SectionSplitProps) {
  return (
    <section id={id} className="section-pad px-6">
      <div className="mx-auto flex min-h-[140vh] max-w-6xl items-center md:min-h-[160vh]">
        <div className="grid w-full gap-12 md:grid-cols-3">
          <div className={reverse ? "md:order-2 md:col-span-2" : "md:col-span-2"}>
            {children}
          </div>
          <div className={`relative min-h-[280px] ${reverse ? "md:order-1" : ""}`}>
            <SectionParticles theme={theme} shapePoints={shapePoints} />
          </div>
        </div>
      </div>
    </section>
  );
}
