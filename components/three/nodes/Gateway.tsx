"use client";

import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

// api-layer - a flattened hex-prism ("entry point") with a thin rim ring
// that always reads as the system's active edge, independent of the body's
// own opacity/highlight state (spec Section 1.2).
export function Gateway({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const rimColor = isEmphasized ? COLOR.signal : COLOR.signalDim;

  return (
    <group scale={scale}>
      <mesh
        rotation-x={Math.PI / 2}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <cylinderGeometry args={[0.42, 0.42, 0.22, 6]} />
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
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.42, 0.03, 8, 24]} />
        <meshBasicMaterial color={rimColor} transparent opacity={bodyOpacity} />
      </mesh>
    </group>
  );
}
