"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sceneNodes, type SceneNode } from "@/lib/architecture-scene";
import { architectureFlows } from "@/lib/architecture-flows";
import { useFlowPlayback } from "@/lib/hooks/use-flow-playback";
import { useDeviceTier } from "@/lib/device-tier";

const ArchitectureCanvas = dynamic(
  () => import("@/components/three/ArchitectureCanvas"),
  {
    ssr: false,
    loading: () => null,
  },
);

// Motion allowed + real WebGL + not an obviously underpowered device. Phones
// are eligible too - they get the compact variant (see isCompactViewport).
// Checked once on mount, not live-reactive to resize: tearing down a
// mounted WebGL context mid-session isn't worth the added complexity here.
function checkEligible(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_3D_VIZ !== "true") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return false;
  if ((navigator.hardwareConcurrency ?? 4) <= 2) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

// Below md the canvas runs its compact variant: fitted portrait camera,
// swipe-to-spin, DOM detail card, lighter rendering.
function isCompactViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
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
  const [compact, setCompact] = useState(false);
  const [intersecting, setIntersecting] = useState(false);
  const [inView, setInView] = useState(false);
  const tier = useDeviceTier();
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
    setCompact(isCompactViewport());
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

  // Separate, persistent observer for pausing: the one above disconnects
  // after first load, this one keeps toggling the canvas's render loop as
  // the section scrolls in and out of view.
  useEffect(() => {
    if (!eligible || !wrapperRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    observer.observe(wrapperRef.current);
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

  const expandedNode = expandedId
    ? sceneNodes.find((n) => n.id === expandedId) ?? null
    : null;
  // On phones each chip row is a single sideways-scrolling strip instead of
  // a wrapping block that would bury half the scene.
  const chipRow = compact
    ? "pointer-events-auto flex w-full flex-nowrap justify-start gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    : "pointer-events-none flex flex-wrap justify-center gap-2";

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
          compact={compact}
          active={inView}
          tier={tier}
        />
      )}
      {mounted && compact && expandedNode && (
        <div className="absolute inset-x-2 top-2 z-10 rounded-lg border border-border border-t-2 border-t-accent bg-bg/90 p-4 font-mono text-[11px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              {expandedNode.label}
            </span>
            <button
              type="button"
              aria-label="Close details"
              className="px-1 text-text-tertiary hover:text-text-primary"
              onClick={handleBackgroundClick}
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed text-text-secondary">{expandedNode.description}</p>
          {expandedNode.caseStudySlug && (
            <button
              type="button"
              className="mt-3 text-accent underline decoration-dotted underline-offset-4"
              onClick={() => handleNavigate(expandedNode.caseStudySlug!)}
            >
              View case study →
            </button>
          )}
        </div>
      )}
      {mounted && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 ${
            compact ? "p-2" : "p-4"
          }`}
        >
          <div
            className={chipRow}
            role="group"
            aria-label="Architecture nodes"
          >
            {keyboardOrder.map((node) => {
              const isActive = hoveredId === node.id || selectedId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className="pointer-events-auto shrink-0 rounded-full border border-border bg-bg/80 px-3 py-1.5 font-mono text-[11px] tracking-wide text-text-tertiary backdrop-blur transition-colors duration-150 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    color: isActive ? "var(--color-accent)" : undefined,
                    borderColor: isActive ? "var(--color-accent)" : undefined,
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
            className={chipRow}
            role="group"
            aria-label="Workflow traces"
          >
            {architectureFlows.map((flow) => {
              const isPlaying = playback.activeFlowId === flow.id;
              return (
                <button
                  key={flow.id}
                  type="button"
                  className="pointer-events-auto shrink-0 rounded-full border border-dashed border-border bg-bg/80 px-3 py-1.5 font-mono text-[11px] tracking-wide text-text-tertiary backdrop-blur transition-colors duration-150 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    color: isPlaying ? "var(--color-accent)" : undefined,
                    borderColor: isPlaying ? "var(--color-accent)" : undefined,
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
