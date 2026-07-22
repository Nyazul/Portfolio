"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { nodeGraphPoints } from "@/lib/particle-shapes";

type Particle = {
  baseX: number;
  baseY: number;
  phaseX: number;
  phaseY: number;
  speed: number;
  targetX: number;
  targetY: number;
  radius: number;
};

// PRD 7.2 / Section 12 kill-switch: gated behind NEXT_PUBLIC_ENABLE_PARTICLES
// so this can be disabled instantly (env var + redeploy, no code rollback)
// if it misbehaves in production - this and the 3D visualizer are the two
// riskiest, most isolated pieces by design.
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_PARTICLES === "true";

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!ENABLED) return;
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      const rect = parent!.getBoundingClientRect();
      // DPR cap (PRD 7.2): no point paying a 3x canvas cost on a high-DPI
      // phone for resolution the eye can't use.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Lighter particle count on narrow viewports - same reasoning as the
    // DPR cap, just applied to count instead of pixel density.
    const count = window.innerWidth < 768 ? 700 : 1800;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const target = nodeGraphPoints[i % nodeGraphPoints.length];
      return {
        baseX: Math.random(),
        baseY: Math.random(),
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
        targetX: target.x,
        targetY: target.y,
        radius: 0.6 + Math.random() * 1.1,
      };
    });

    // Scroll progress lives in a plain ref, updated by a rAF-throttled
    // scroll listener (PRD 7.2: "read once per frame via a scroll-progress
    // store, not recomputed per native scroll event"). The render loop
    // below reads this value each frame rather than each loop doing its
    // own scroll math.
    const progress = { current: 0 };
    let scrollScheduled = false;

    // Fraction of the hero's own height over which the resolve happens.
    // Deliberately short: the canvas is clipped to the hero's box, so if
    // this were 1.0 the "fully resolved" moment would only ever occur once
    // the hero (and the canvas with it) had already scrolled completely out
    // of view - a real bug caught by screenshotting the actual scroll
    // sequence rather than just reading the code. Resolving within the
    // first ~35% of the hero's scroll-out means the shape is fully formed
    // and sits there, still clearly visible, before the hero naturally
    // scrolls away.
    const RESOLVE_FRACTION = 0.35;

    function updateProgress() {
      scrollScheduled = false;
      const rect = parent!.getBoundingClientRect();
      const raw = -rect.top / (rect.height * RESOLVE_FRACTION);
      progress.current = Math.min(Math.max(raw, 0), 1);
    }
    function onScroll() {
      if (!scrollScheduled) {
        scrollScheduled = true;
        requestAnimationFrame(updateProgress);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    updateProgress();

    const start = performance.now();

    function draw(now: number, forceProgress?: number) {
      ctx!.clearRect(0, 0, width, height);
      const t = (now - start) / 1000;
      const p = forceProgress ?? progress.current;
      ctx!.fillStyle = "rgba(245, 245, 245, 0.5)";
      for (const particle of particles) {
        const idleX = particle.baseX + Math.sin(t * particle.speed + particle.phaseX) * 0.015;
        const idleY = particle.baseY + Math.cos(t * particle.speed + particle.phaseY) * 0.015;
        const x = (idleX + (particle.targetX - idleX) * p) * width;
        const y = (idleY + (particle.targetY - idleY) * p) * height;
        ctx!.beginPath();
        ctx!.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    // Reduced motion (PRD 7.5): a single static frame of the resolved
    // shape, no animation loop at all - not a slowed-down version of it.
    if (prefersReducedMotion) {
      draw(performance.now(), 1);
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
      };
    }

    let raf = requestAnimationFrame(function loop(now) {
      draw(now);
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [prefersReducedMotion]);

  if (!ENABLED) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}
