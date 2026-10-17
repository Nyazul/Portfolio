"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getDeviceTier } from "@/lib/device-tier";

// Same kill switch as the rest of the particle system (PRD Section 12) - one
// env var disables the whole thing, no code rollback needed.
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_PARTICLES === "true";

// Upper bound on how long the engine waits for an idle moment before
// loading anyway (also the fallback delay where requestIdleCallback is
// missing, e.g. Safari).
const IDLE_TIMEOUT_MS = 2000;

// Thin shell around ./particle-engine. The engine (and three.js with it) is
// imported only once the browser is idle after hydration, so it no longer
// sits in the home page's first-load bundle or competes with the hero's
// intro animation. The canvas fades in when it starts rather than popping.
export function ParticleSystem() {
  const mountRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!ENABLED) return;
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let stop: (() => void) | null = null;

    const start = () => {
      import("./particle-engine").then(({ startParticles }) => {
        if (cancelled) return;
        stop = startParticles(mount, {
          reducedMotion: prefersReducedMotion,
          tier: getDeviceTier(),
        });
        setRunning(true);
      });
    };

    const idleId =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS })
        : null;
    const timeoutId = idleId === null ? window.setTimeout(start, IDLE_TIMEOUT_MS / 2) : null;

    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      stop?.();
    };
  }, [prefersReducedMotion]);

  if (!ENABLED) return null;

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none fixed inset-0 z-[5] transition-opacity duration-1000 ${
        running ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    />
  );
}
