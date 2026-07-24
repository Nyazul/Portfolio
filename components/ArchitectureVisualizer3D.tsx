"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sceneNodes, type SceneNode } from "@/lib/architecture-scene";

const ArchitectureCanvas = dynamic(
  () => import("@/components/three/ArchitectureCanvas"),
  {
    ssr: false,
    loading: () => null,
  },
);

// Same breakpoint/media-query convention as SectionReveal.tsx - desktop +
// motion allowed only. Checked once on mount, not live-reactive to resize:
// tearing down a mounted WebGL context mid-session on a rare breakpoint
// crossing isn't worth the added complexity here.
function checkEligible(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_3D_VIZ !== "true") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return false;
  if (!window.matchMedia("(min-width: 768px)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

// Keyboard tab order: orbit nodes in their natural service-flow order, hub
// last (it's a highlight-only target, not the primary destination).
const keyboardOrder = [
  ...sceneNodes.filter((n) => !n.isHub),
  ...sceneNodes.filter((n) => n.isHub),
];

export function ArchitectureVisualizer3D({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [intersecting, setIntersecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setEligible(checkEligible());
  }, []);

  useEffect(() => {
    if (!eligible || !wrapperRef.current) return;
    const el = wrapperRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eligible]);

  useEffect(() => {
    if (mounted) onReady();
    // onReady is expected to be stable (setState from the parent); only
    // re-fire if `mounted` itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleSelect = (node: SceneNode) => {
    setSelectedId(node.id);
    // Selecting a node that isn't currently hovered (keyboard focus path)
    // should still highlight it immediately rather than waiting on a
    // separate hover event.
    setHoveredId(node.id);
  };

  const handleDollyComplete = (node: SceneNode) => {
    if (node.caseStudySlug) router.push(`/work/${node.caseStudySlug}`);
  };

  if (!eligible) return null;

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      {intersecting && (
        <ArchitectureCanvas
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHoverChange={setHoveredId}
          onSelect={handleSelect}
          onDollyComplete={handleDollyComplete}
          onMounted={() => setMounted(true)}
        />
      )}
      {mounted && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-4"
          role="group"
          aria-label="Architecture nodes"
        >
          {keyboardOrder.map((node) => {
            const isActive = hoveredId === node.id || selectedId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                className="pointer-events-auto rounded-full border border-border bg-bg/80 px-3 py-1.5 font-mono text-[11px] tracking-wide text-text-tertiary backdrop-blur transition-colors duration-150 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  color: isActive ? "var(--color-signal)" : undefined,
                  borderColor: isActive ? "var(--color-signal)" : undefined,
                }}
                aria-label={
                  node.caseStudySlug
                    ? `View case study: ${node.label}`
                    : `Highlight ${node.label} (no case study)`
                }
                onFocus={() => setHoveredId(node.id)}
                onBlur={() =>
                  setHoveredId((current) =>
                    current === node.id ? null : current,
                  )
                }
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() =>
                  setHoveredId((current) =>
                    current === node.id ? null : current,
                  )
                }
                onClick={() => handleSelect(node)}
              >
                {node.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
