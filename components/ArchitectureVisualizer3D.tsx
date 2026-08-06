"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sceneNodes, type SceneNode } from "@/lib/architecture-scene";
import { architectureFlows } from "@/lib/architecture-flows";
import { useFlowPlayback } from "@/lib/hooks/use-flow-playback";

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

// Autoplay-once delay after first scroll-into-view (spec Section 2.4) - long
// enough that it doesn't fire during the entry transition.
const AUTOPLAY_DELAY_MS = 1200;
const AUTOPLAY_FLOW_ID = "request";

// Collapse-then-expand handoff duration when switching directly from one
// expanded node to another (spec Section 3.1) - matches the panel's own
// exit transition (duration-fast, 0.2s) closely enough to avoid a visible
// gap, while staying near the spec's suggested ~150ms.
const PANEL_SWITCH_MS = 150;

export function ArchitectureVisualizer3D({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [intersecting, setIntersecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { state: playback, play, stop } = useFlowPlayback();
  const autoplayedRef = useRef(false);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

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

  // Autoplay the "request" flow exactly once, the first time the canvas is
  // both mounted and in view - never re-fires on scroll-out/scroll-in
  // (spec Section 2.4). checkEligible() already excludes
  // prefers-reduced-motion users from the whole 3D canvas, so no
  // additional reduced-motion guard is needed here.
  useEffect(() => {
    if (!mounted || !intersecting || autoplayedRef.current) return;
    autoplayedRef.current = true;
    const t = setTimeout(() => play(AUTOPLAY_FLOW_ID), AUTOPLAY_DELAY_MS);
    return () => clearTimeout(t);
  }, [mounted, intersecting, play]);

  // Escape collapses/deselects whenever a panel is open (spec Section 3.4).
  useEffect(() => {
    if (!expandedId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setExpandedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedId]);

  const handleSelect = (node: SceneNode) => {
    // Selection takes visual priority over an in-progress trace (spec
    // Section 2.2) - cancel any playing flow the moment a node is picked.
    stop();

    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }

    if (selectedId === node.id && expandedId === node.id) {
      // Second click/Enter on the already-expanded node collapses it
      // (spec Section 3.1).
      setSelectedId(null);
      setExpandedId(null);
      return;
    }

    if (expandedId && expandedId !== node.id) {
      // Switching directly from one expanded node to another: collapse the
      // current panel first and let its exit animation finish before
      // running the normal select+dolly+expand sequence for the new node -
      // don't hard-cut between panels (spec Section 3.1).
      setExpandedId(null);
      switchTimerRef.current = setTimeout(() => {
        setSelectedId(node.id);
        setHoveredId(node.id);
        setExpandedId(node.id);
        switchTimerRef.current = null;
      }, PANEL_SWITCH_MS);
      return;
    }

    setSelectedId(node.id);
    // Selecting a node that isn't currently hovered (keyboard focus path)
    // should still highlight it immediately rather than waiting on a
    // separate hover event.
    setHoveredId(node.id);
    setExpandedId(node.id);
  };

  const handleBackgroundClick = () => {
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    setSelectedId(null);
    setExpandedId(null);
  };

  const handleDollyComplete = () => {
    // Arrival no longer auto-navigates (spec Section 3.2.3) - navigation
    // now only fires from the expand panel's explicit "View case study"
    // button, so expand-only clicks don't unexpectedly leave the page.
  };

  const handleNavigate = (slug: string) => {
    router.push(`/work/${slug}`);
  };

  if (!eligible) return null;

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      {intersecting && (
        <ArchitectureCanvas
          hoveredId={hoveredId}
          selectedId={selectedId}
          expandedId={expandedId}
          onHoverChange={setHoveredId}
          onSelect={handleSelect}
          onNavigate={handleNavigate}
          onBackgroundClick={handleBackgroundClick}
          onDollyComplete={handleDollyComplete}
          playback={playback}
          onMounted={() => setMounted(true)}
        />
      )}
      {mounted && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
          <div
            className="pointer-events-none flex flex-wrap justify-center gap-2"
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
          {/* Flow-toggle chips - visually separated (own row + divider)
              from the node-highlight buttons above so the two interaction
              types ("highlight a node" vs "play a flow") don't blur
              together (spec Section 2.4). */}
          <div className="flex w-full max-w-xs items-center gap-2">
            <div className="h-px flex-1 bg-border" aria-hidden />
            <span className="font-mono text-[9px] uppercase tracking-wide text-text-tertiary">
              Flows
            </span>
            <div className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div
            className="pointer-events-none flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Workflow traces"
          >
            {architectureFlows.map((flow) => {
              const isPlaying = playback.activeFlowId === flow.id;
              return (
                <button
                  key={flow.id}
                  type="button"
                  className="pointer-events-auto rounded-full border border-dashed border-border bg-bg/80 px-3 py-1.5 font-mono text-[11px] tracking-wide text-text-tertiary backdrop-blur transition-colors duration-150 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    color: isPlaying ? "var(--color-signal)" : undefined,
                    borderColor: isPlaying ? "var(--color-signal)" : undefined,
                  }}
                  aria-label={`Play flow: ${flow.label}`}
                  onClick={() => play(flow.id)}
                >
                  {flow.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
