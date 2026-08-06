"use client";

import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

// storage - a bucket/container silhouette (tapered cylinder + lid rim), no
// idle animation (spec Section 1.2), same "static/solid" family as database.
export function Storage({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  return (
    <group scale={scale}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <cylinderGeometry args={[0.3, 0.24, 0.5, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.08}
          transparent
          opacity={bodyOpacity}
          emissive={isEmphasized ? COLOR.signal : "#000000"}
          emissiveIntensity={isEmphasized ? 0.18 : 0}
        />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.03, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.08}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>
    </group>
  );
}
