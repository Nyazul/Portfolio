import Link from "next/link";
import { SectionSplit } from "@/components/motion/SectionSplit";
import { SectionHeading } from "@/components/SectionHeading";
import { sectionShapes } from "@/lib/particle-shapes";
import { getCaseStudy } from "@/lib/case-studies";

// Each principle is distilled from a case study and links to it - a claim
// with its evidence one click away, rather than a list of adjectives.
const principles = [
  {
    title: "Let the database enforce invariants.",
    body: "If a rule must hold under concurrency, put it where every write has to pass through it. A guarded UPDATE beats a careful service method.",
    proof: "billing-concurrency",
  },
  {
    title: "Events across domains, calls within them.",
    body: "Modules that call each other directly can't change independently. Publish what happened, let others react after commit, and make the build verify it.",
    proof: "module-boundary-fix",
  },
  {
    title: "Read generated code like it's your own.",
    body: "AI-written code compiles and demos well. The bugs live in permissions, visibility and routing, which only careful reading against the rules will catch.",
    proof: "agent-code-review",
  },
  {
    title: "Clean up what you create.",
    body: "Every create path needs a delete path designed alongside it. Orphaned data costs money quietly, forever.",
    proof: "s3-document-lifecycle",
  },
];

export function Principles() {
  return (
    <SectionSplit id="principles" theme="light" shapePoints={sectionShapes.principles}>
      <SectionHeading index="06" label="Principles" headline="How I make decisions." />
      <ol className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
        {principles.map((p, i) => {
          const study = getCaseStudy(p.proof);
          return (
            <li key={p.title} className="flex flex-col bg-bg p-6 md:p-8">
              <span className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-xl leading-snug font-medium text-text-primary">
                {p.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                {p.body}
              </p>
              {study && (
                <Link
                  href={`/work/${study.slug}`}
                  data-cursor="Proof"
                  className="group mt-6 inline-flex items-center gap-2 font-mono text-xs text-text-tertiary transition-colors hover:text-accent"
                >
                  See it in practice
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </SectionSplit>
  );
}
