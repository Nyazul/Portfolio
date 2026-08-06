"use client";

import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

const DISK_Y = [-0.18, 0, 0.18];

// database - 3 stacked thin "disks", no idle animation (spec Section 1.2):
// database is deliberately the most static/solid node type, a contrast
// against queue/cache's continuous motion.
export function Database({
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
      {DISK_Y.map((y, i) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={onClick}
        >
          <cylinderGeometry args={[0.32, 0.32, 0.08, 20]} />
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
      ))}
    </group>
  );
}
