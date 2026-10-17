"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, Panel, glowFor } from "./materials";

const CHEVRONS = 3;
const TRAVEL = 0.9;

// api-layer - a gate: two aluminium pillars and a lintel on a dark sill, with
// glowing chevrons continuously streaming through it (requests coming in).
export function Gateway({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const chevronRefs = useRef<(Group | null)[]>([]);
  const glow = glowFor(isEmphasized);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    chevronRefs.current.forEach((g, i) => {
      if (!g) return;
      const p = ((t * 0.45 + i / CHEVRONS) % 1);
      g.position.z = -TRAVEL / 2 + p * TRAVEL;
      const s = Math.sin(p * Math.PI);
      g.scale.setScalar(0.6 + s * 0.4);
    });
  });

  const handlers = { onPointerOver, onPointerOut, onClick };

  return (
    <group scale={scale}>
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0, 0]} {...handlers}>
          <boxGeometry args={[0.13, 0.78, 0.26]} />
          <Metal opacity={bodyOpacity} />
          <Outline show={isEmphasized} />
        </mesh>
      ))}
      <mesh position={[0, 0.43, 0]} {...handlers}>
        <boxGeometry args={[0.84, 0.12, 0.28]} />
        <Metal opacity={bodyOpacity} />
        <Outline show={isEmphasized} />
      </mesh>
      {/* glowing strip under the lintel */}
      <mesh position={[0, 0.365, 0]}>
        <boxGeometry args={[0.55, 0.012, 0.2]} />
        <Glow opacity={bodyOpacity} intensity={glow} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[0.96, 0.06, 0.5]} />
        <Panel opacity={bodyOpacity} />
      </mesh>
      {Array.from({ length: CHEVRONS }).map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            chevronRefs.current[i] = g;
          }}
        >
          {[1, -1].map((side) => (
            <mesh
              key={side}
              position={[side * 0.07, 0, 0]}
              rotation={[0, side * 0.75, 0]}
            >
              <boxGeometry args={[0.2, 0.04, 0.03]} />
              <Glow opacity={bodyOpacity} intensity={glow} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
