"use client";

import { RoundedBox } from "@react-three/drei";
import type { NodeVisualProps } from "./types";

// app-server - the central node, now a chunky rounded box like every other
// type (dropped the earlier MeshTransmissionMaterial glass look - it read
// as out-of-place against the matte "toy block" aesthetic used everywhere
// else). Kept as the single largest body via its own geometry args plus
// the bigger BASE_HUB_SCALE already applied by the parent Node wrapper -
// still visually distinct without needing a different material.
export function Hub({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  return (
    <RoundedBox
      args={[0.9, 0.68, 0.9]}
      radius={0.14}
      smoothness={4}
      scale={scale}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.06}
        transparent
        opacity={bodyOpacity}
        emissive={isEmphasized ? color : "#000000"}
        emissiveIntensity={isEmphasized ? 0.18 : 0}
      />
    </RoundedBox>
  );
}
