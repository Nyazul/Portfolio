"use client";

import Link from "next/link";
import { useState } from "react";
import { architectureNodes } from "@/lib/architecture-nodes";
import { SectionSplit } from "@/components/motion/SectionSplit";
import { sectionShapes } from "@/lib/particle-shapes";
import { ArchitectureVisualizer3D } from "@/components/ArchitectureVisualizer3D";

// Phase 1 shipped the static monochrome grid as the required fallback
// FIRST (PRD Section 6.3 / 9.1), not bolted on after the 3D version - it
// stays in the DOM unconditionally: no-JS, pre-hydration, mobile, reduced-
// motion, no-WebGL, and the flag-off case all render this and nothing else.
// Phase 4 layers the interactive version on top, absolutely positioned
// over it, only once ArchitectureVisualizer3D confirms it has actually
// mounted - never before, so there's no gap where neither is visible and
// no layout jump, since this wrapper's height is still set by the grid.
export function ArchitectureSection() {
  const [show3D, setShow3D] = useState(false);

  return (
    <SectionSplit
      id="architecture"
      theme="dark"
      shapePoints={sectionShapes.architecture}
      reverse
    >
      <div className="mb-12 flex items-baseline justify-between">
        <h2 className="font-mono text-sm text-text-tertiary">
          02 / Architecture
        </h2>
        <p className="text-sm text-text-tertiary">
          {show3D
            ? "Hover or tab through nodes"
            : "Static view — 3D loads on desktop"}
        </p>
      </div>
      <div className="relative">
        <div
          className={
            show3D
              ? "invisible grid grid-cols-2 gap-px bg-border"
              : "grid grid-cols-2 gap-px bg-border"
          }
        >
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
        <ArchitectureVisualizer3D onReady={() => setShow3D(true)} />
      </div>
    </SectionSplit>
  );
}
