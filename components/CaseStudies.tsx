import Link from "next/link";
import { caseStudies } from "@/lib/case-studies";
import { SectionSplit } from "@/components/motion/SectionSplit";
import { SectionHeading } from "@/components/SectionHeading";
import { sectionShapes } from "@/lib/particle-shapes";

// Editorial rows rather than cards: index, title, one-line excerpt, stack.
// Hover wipes the row's background in from the left (clip-path, so no
// layout shift), nudges the title and slides an accent arrow in. Pure CSS -
// this stays a server component.
export function CaseStudies() {
  return (
    <SectionSplit id="work" theme="light" shapePoints={sectionShapes.work}>
      <SectionHeading index="03" label="Case studies" headline="Bugs worth writing about." />
      <ol className="border-t border-border">
        {caseStudies.map((study, i) => (
          <li key={study.slug} className="border-b border-border">
            <Link
              href={`/work/${study.slug}`}
              data-cursor="Read"
              className="group relative grid gap-4 py-8 md:grid-cols-[3rem_1fr_auto] md:gap-6 md:py-10"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -mx-4 bg-surface [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-[var(--ease-out-expo)] group-hover:[clip-path:inset(0_0_0_0)] md:-mx-6"
              />
              <span className="relative font-mono text-sm text-text-tertiary transition-colors duration-300 group-hover:text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative">
                <h3 className="text-xl font-medium text-text-primary transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2 md:text-2xl">
                  {study.title}
                </h3>
                <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                  {study.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {study.stack.map((tag) => (
                    <span
                      key={tag}
                      className="border border-border px-2 py-1 font-mono text-xs text-text-tertiary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span
                aria-hidden="true"
                className="relative hidden h-12 w-12 items-center justify-center self-center overflow-hidden rounded-full border border-border text-text-primary transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-[#0A0A0A] md:flex"
              >
                <span className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-[150%]">
                  →
                </span>
                <span className="absolute -translate-x-[150%] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </SectionSplit>
  );
}
