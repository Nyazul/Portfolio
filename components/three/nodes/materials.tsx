"use client";

import { Edges } from "@react-three/drei";
import { COLOR } from "@/lib/architecture-colors";

// Shared material vocabulary for every node model, so the scene reads as one
// piece of hardware rather than eight unrelated primitives:
//   Metal  - brushed-aluminium shell (picks up the Environment reflections)
//   Panel  - dark recessed faces / screens / trays
//   Glow   - the orange accent; toneMapped off + intensity > 1 so Bloom
//            catches it (LEDs, seams, data in motion)
//   Outline - orange edge outline shown only while a node is emphasized

export const GLOW_REST = 1.8;
export const GLOW_EMPHASIZED = 4.5;

export function Metal({ opacity }: { opacity: number }) {
  return (
    <meshStandardMaterial
      color={COLOR.metal}
      metalness={0.85}
      roughness={0.32}
      envMapIntensity={1.1}
      transparent
      opacity={opacity}
    />
  );
}

export function Panel({ opacity }: { opacity: number }) {
  return (
    <meshStandardMaterial
      color={COLOR.panel}
      metalness={0.4}
      roughness={0.5}
      transparent
      opacity={opacity}
    />
  );
}

export function Glow({
  opacity,
  intensity = GLOW_REST,
}: {
  opacity: number;
  intensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={COLOR.accent}
      emissive={COLOR.accent}
      emissiveIntensity={intensity}
      toneMapped={false}
      transparent
      opacity={opacity}
    />
  );
}

export function Outline({ show }: { show: boolean }) {
  if (!show) return null;
  return <Edges threshold={25} color={COLOR.accent} />;
}

export function glowFor(isEmphasized: boolean) {
  return isEmphasized ? GLOW_EMPHASIZED : GLOW_REST;
}
