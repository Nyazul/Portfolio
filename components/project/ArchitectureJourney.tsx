"use client";

import { useEffect, useRef, useState } from "react";
import type { DiagramEdge, DiagramNode, JourneyStep } from "@/lib/projects";

type Props = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: JourneyStep[];
};

// Scrollytelling walkthrough: the system diagram stays pinned while the
// numbered steps scroll past, and whichever step is crossing the middle of
// the viewport lights up the nodes and connections it's about. Steps are
// plain readable text first; the diagram is an aid, not the content.
export function ArchitectureJourney({ nodes, edges, steps }: Props) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      // A thin band across the middle of the viewport.
      { rootMargin: "-45% 0px -50% 0px" },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [steps.length]);

  const step = steps[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      <div className="sticky top-20 z-[2] -mx-6 self-start border-b border-border bg-bg px-6 pb-4 lg:top-28 lg:mx-0 lg:border-0 lg:px-0 lg:pb-0">
        <ProjectDiagram
          nodes={nodes}
          edges={edges}
          activeNodes={new Set(step.nodes)}
          activeEdges={new Set(step.edges)}
        />
        <p className="mt-3 font-mono text-xs text-text-tertiary" aria-live="polite">
          <span className="text-accent">{String(active + 1).padStart(2, "0")}</span> / {String(steps.length).padStart(2, "0")} · {step.title}
        </p>
      </div>

      <ol className="space-y-[30vh] pb-[20vh] lg:space-y-[38vh] lg:pt-[8vh]">
        {steps.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-step={i}
            className={`transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-40"}`}
          >
            <p className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-2 text-2xl font-medium tracking-tight text-text-primary md:text-3xl">{s.title}</h3>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-text-secondary md:text-lg">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function edgePath(a: DiagramNode, b: DiagramNode, bend = 0) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function ProjectDiagram({
  nodes,
  edges,
  activeNodes,
  activeEdges,
}: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  activeNodes: Set<string>;
  activeEdges: Set<string>;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    // Fixed share of the viewport below lg, so the pinned diagram never
    // crowds out the step text it illustrates; natural 4:3 beside it on lg+.
    <div className="relative h-[40svh] w-full overflow-hidden rounded-lg border border-border bg-bg-elevated lg:h-auto lg:aspect-[4/3]" role="img" aria-label="System architecture diagram">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const on = activeEdges.has(e.id);
          return (
            <path
              key={e.id}
              d={edgePath(a, b, e.bend)}
              fill="none"
              stroke={on ? "var(--color-accent)" : "var(--color-border)"}
              strokeWidth={on ? 2 : 1.25}
              strokeDasharray={on ? "6 5" : e.dashed ? "3 4" : undefined}
              vectorEffect="non-scaling-stroke"
              className={on ? "edge-flow" : undefined}
              style={{ transition: "stroke 0.4s" }}
            />
          );
        })}
      </svg>
      {nodes.map((n) => {
        const on = activeNodes.has(n.id);
        return (
          <div
            key={n.id}
            className={`absolute w-[17.5%] -translate-x-1/2 -translate-y-1/2 rounded-md border px-1.5 py-1 text-center transition-colors duration-500 sm:px-2 sm:py-1.5 ${
              on ? "border-accent bg-bg text-text-primary" : "border-border bg-bg text-text-tertiary"
            } ${n.kind === "store" || n.kind === "queue" ? "rounded-xl" : ""} ${n.kind === "job" ? "border-dashed" : ""}`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <p className={`font-mono text-[9px] leading-tight break-words sm:text-[11px] ${on ? "text-accent" : ""}`}>{n.label}</p>
            {n.sub && <p className="hidden text-[9px] leading-tight sm:block sm:text-[10px]">{n.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}
