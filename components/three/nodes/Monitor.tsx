"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Mesh } from "three";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, Panel, glowFor } from "./materials";

const BARS = 9;
const BAR_W = 0.055;
const GRAPH_H = 0.3;

// monitoring - a display on a stand showing a live, constantly shifting
// orange bar graph (the observability dashboard).
export function Monitor({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const barRefs = useRef<(Mesh | null)[]>([]);
  const glow = glowFor(isEmphasized);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    barRefs.current.forEach((m, i) => {
      if (!m) return;
      const v =
        0.35 +
        0.3 * Math.sin(t * 1.3 + i * 0.8) +
        0.2 * Math.sin(t * 3.1 + i * 2.3);
      const h = Math.max(0.08, Math.min(1, v)) * GRAPH_H;
      m.scale.y = h;
      m.position.y = -GRAPH_H / 2 + h / 2;
    });
  });

  return (
    <group scale={scale}>
      <RoundedBox
        args={[0.9, 0.58, 0.06]}
        radius={0.03}
        smoothness={3}
        position={[0, 0.12, 0]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <Metal opacity={bodyOpacity} />
        <Outline show={isEmphasized} />
      </RoundedBox>
      <mesh position={[0, 0.12, 0.031]}>
        <boxGeometry args={[0.8, 0.48, 0.004]} />
        <Panel opacity={bodyOpacity} />
      </mesh>
      {/* graph baseline */}
      <mesh position={[0, 0.12 - GRAPH_H / 2 - 0.01, 0.036]}>
        <boxGeometry args={[0.66, 0.004, 0.002]} />
        <Metal opacity={bodyOpacity * 0.6} />
      </mesh>
      <group position={[0, 0.12, 0.036]}>
        {Array.from({ length: BARS }).map((_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              barRefs.current[i] = m;
            }}
            position={[-0.3 + i * (0.6 / (BARS - 1)), 0, 0]}
          >
            <boxGeometry args={[BAR_W, 1, 0.004]} />
            <Glow opacity={bodyOpacity} intensity={glow} />
          </mesh>
        ))}
      </group>
      {/* stand */}
      <mesh position={[0, -0.26, -0.02]}>
        <boxGeometry args={[0.07, 0.22, 0.04]} />
        <Metal opacity={bodyOpacity} />
      </mesh>
      <mesh position={[0, -0.38, -0.02]}>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 32]} />
        <Metal opacity={bodyOpacity} />
      </mesh>
    </group>
  );
}
