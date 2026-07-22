"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Point } from "@/lib/particle-shapes";
import type { SectionTheme } from "@/lib/theme-colors";

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

// Same kill switch as the hero's particle field (PRD Section 12) - one env
// var disables every particle instance on the page at once.
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_PARTICLES === "true";

type SectionParticlesProps = {
  theme: SectionTheme;
  shapePoints: Point[];
};

// Converges into `shapePoints` when this component's container is centered
// in the viewport, scatters back to idle drift as it moves away - which
// naturally covers both halves of the brief ("form in the middle of a
// section, scatter between sections") with one continuous distance-based
// value rather than separate enter/exit triggers.
export function SectionParticles({ theme, shapePoints }: SectionParticlesProps) {
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

    // Lighter count than the hero field - these columns are roughly a
    // third of the page width, not a full-bleed hero background.
    const count = window.innerWidth < 768 ? 300 : 650;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const target = shapePoints[i % shapePoints.length];
      return {
        baseX: Math.random(),
        baseY: Math.random(),
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
        targetX: target.x,
        targetY: target.y,
        radius: 0.6 + Math.random() * 1.0,
      };
    });

    const progress = { current: 0 };
    let scrollScheduled = false;

    function updateProgress() {
      scrollScheduled = false;
      const rect = parent!.getBoundingClientRect();
      const containerCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const dist = Math.abs(containerCenter - viewportCenter);
      // Fully formed when centered in the viewport; fully scattered by the
      // time it's ~60% of a viewport-height away from center. That window
      // is deliberately generous so the shape holds for a while rather than
      // snapping in and out.
      const raw = 1 - dist / (window.innerHeight * 0.6);
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
    // Flip particle color to match the section's own theme (this was a
    // real bug otherwise: light particles on a light section, or dark on
    // dark, are simply invisible).
    const rgb = theme === "dark" ? "245, 245, 245" : "10, 10, 10";

    function draw(now: number, forceProgress?: number) {
      ctx!.clearRect(0, 0, width, height);
      const t = (now - start) / 1000;
      const p = forceProgress ?? progress.current;
      ctx!.fillStyle = `rgba(${rgb}, 0.55)`;
      for (const particle of particles) {
        const idleX = particle.baseX + Math.sin(t * particle.speed + particle.phaseX) * 0.02;
        const idleY = particle.baseY + Math.cos(t * particle.speed + particle.phaseY) * 0.02;
        const x = (idleX + (particle.targetX - idleX) * p) * width;
        const y = (idleY + (particle.targetY - idleY) * p) * height;
        ctx!.beginPath();
        ctx!.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

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
  }, [theme, shapePoints, prefersReducedMotion]);

  if (!ENABLED) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
  );
}
