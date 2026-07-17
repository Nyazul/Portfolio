import Link from "next/link";
import { architectureNodes } from "@/lib/architecture-nodes";

// Phase 1: static monochrome grid, same data that will drive the interactive
// 3D visualizer in Phase 4 (PRD Section 6.3 / 9.1) - this IS the required
// fallback, built first rather than bolted on afterward.
export function ArchitectureSection() {
  return (
    <section
      id="architecture"
      className="section-pad border-b border-border px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-baseline justify-between">
          <h2 className="font-mono text-sm text-text-tertiary">
            02 / Architecture
          </h2>
          <p className="text-sm text-text-tertiary">
            Interactive 3D version — Phase 4
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
          {architectureNodes.map((node) => {
            const content = (
              <div className="flex h-full flex-col justify-between bg-bg p-6 transition-colors duration-200 hover:bg-surface">
                <span className="font-mono text-xs text-text-tertiary">
                  {node.label}
                </span>
                <p className="mt-8 text-sm text-text-secondary">
                  {node.description}
                </p>
              </div>
            );
            return node.caseStudySlug ? (
              <Link
                key={node.id}
                href={`/work/${node.caseStudySlug}`}
                className="block min-h-[160px]"
              >
                {content}
              </Link>
            ) : (
              <div key={node.id} className="min-h-[160px]">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
