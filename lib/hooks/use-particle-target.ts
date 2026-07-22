"use client";

import { useEffect, useRef } from "react";
import {
  registerParticleTarget,
  unregisterParticleTarget,
} from "@/lib/particle-store";
import type { Point } from "@/lib/particle-shapes";
import type { SectionTheme } from "@/lib/theme-colors";

let orderCounter = 0;

// One call per section. Returns a ref - attach it to the section's empty
// "leave space for the shape" element. The global <ParticleSystem/> reads
// this element's getBoundingClientRect() every frame; nothing renders inside
// it, it's purely a screen-space marker.
export function useParticleTarget(
  id: string,
  theme: SectionTheme,
  shapePoints: Point[] | null,
) {
  const ref = useRef<HTMLDivElement>(null);
  const orderRef = useRef<number | null>(null);
  if (orderRef.current === null) {
    orderRef.current = orderCounter++;
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerParticleTarget({
      id,
      el,
      theme,
      shapePoints,
      order: orderRef.current!,
    });
    return () => unregisterParticleTarget(id);
    // shapePoints arrays are module-level constants (see lib/particle-shapes.ts)
    // so identity is stable - safe to depend on directly without memoizing at
    // every call site.
  }, [id, theme, shapePoints]);

  return ref;
}
