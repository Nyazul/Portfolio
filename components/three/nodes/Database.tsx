"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, Panel, glowFor } from "./materials";

const DISK_Y = [-0.22, 0, 0.22];
const SEAM_Y = [-0.11, 0.11];

// database - the classic stacked-platter cylinder, in aluminium, with
// glowing seams between platters that breathe slowly (steady, durable -
// deliberately the calmest node) and a dark inset lid.
export function Database({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const seamRefs = useRef<(Mesh | null)[]>([]);
  const base = glowFor(isEmphasized);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    seamRefs.current.forEach((m, i) => {
      if (!m) return;
      (m.material as MeshStandardMaterial).emissiveIntensity =
        base * (0.7 + 0.3 * Math.sin(t * 1.4 + i * 1.2));
    });
  });

  return (
    <group scale={scale}>
      {DISK_Y.map((y) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={onClick}
        >
          <cylinderGeometry args={[0.36, 0.36, 0.19, 48]} />
          <Metal opacity={bodyOpacity} />
          <Outline show={isEmphasized} />
        </mesh>
      ))}
      {SEAM_Y.map((y, i) => (
        <mesh
          key={y}
          ref={(m) => {
            seamRefs.current[i] = m;
          }}
          position={[0, y, 0]}
        >
          <cylinderGeometry args={[0.365, 0.365, 0.025, 48]} />
          <Glow opacity={bodyOpacity} intensity={base} />
        </mesh>
      ))}
      <mesh position={[0, 0.316, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.01, 48]} />
        <Panel opacity={bodyOpacity} />
      </mesh>
    </group>
  );
}
