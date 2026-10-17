"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, Panel, glowFor } from "./materials";

// 3x2 grid of stored objects in an open tray.
const SLOTS: [number, number][] = [
  [-0.22, -0.12],
  [0, -0.12],
  [0.22, -0.12],
  [-0.22, 0.12],
  [0, 0.12],
  [0.22, 0.12],
];
const CYCLE = 1.6; // seconds per object lift

// storage - object storage as a dark tray of aluminium blocks; one object at
// a time lifts out glowing (an upload / presigned download in flight) and
// settles back, cycling through the slots.
export function Storage({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const blockRefs = useRef<(Group | null)[]>([]);
  const glow = glowFor(isEmphasized);
  const glowRefs = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const active = Math.floor(t / CYCLE) % SLOTS.length;
    const p = (t % CYCLE) / CYCLE;
    blockRefs.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = i === active ? Math.sin(p * Math.PI) * 0.28 : 0;
    });
    glowRefs.current.forEach((g, i) => {
      if (g) g.visible = i === active;
    });
  });

  return (
    <group scale={scale}>
      <mesh
        position={[0, -0.16, 0]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <boxGeometry args={[0.8, 0.06, 0.58]} />
        <Panel opacity={bodyOpacity} />
        <Outline show={isEmphasized} />
      </mesh>
      {/* tray walls */}
      {[
        { p: [0, -0.08, 0.29], s: [0.8, 0.12, 0.02] },
        { p: [0, -0.08, -0.29], s: [0.8, 0.12, 0.02] },
        { p: [0.4, -0.08, 0], s: [0.02, 0.12, 0.58] },
        { p: [-0.4, -0.08, 0], s: [0.02, 0.12, 0.58] },
      ].map((w, i) => (
        <mesh key={i} position={w.p as [number, number, number]}>
          <boxGeometry args={w.s as [number, number, number]} />
          <Metal opacity={bodyOpacity} />
        </mesh>
      ))}
      {SLOTS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <group
            ref={(g) => {
              blockRefs.current[i] = g;
            }}
          >
            <RoundedBox
              args={[0.17, 0.2, 0.17]}
              radius={0.025}
              smoothness={2}
              onPointerOver={onPointerOver}
              onPointerOut={onPointerOut}
              onClick={onClick}
            >
              <Metal opacity={bodyOpacity} />
            </RoundedBox>
            <group
              ref={(g) => {
                glowRefs.current[i] = g;
              }}
              visible={false}
            >
              <mesh position={[0, 0.101, 0]}>
                <boxGeometry args={[0.13, 0.006, 0.13]} />
                <Glow opacity={bodyOpacity} intensity={glow} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}
