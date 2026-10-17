"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, Panel, glowFor } from "./materials";

const PIN_OFFSETS = [-0.24, -0.12, 0, 0.12, 0.24];

// workers - a processor package: dark substrate, aluminium heat spreader,
// rows of pins on every edge and a die that glows harder in bursts (jobs
// being picked up), with a thin trace ring spinning above it.
export function Compute({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const dieRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const base = glowFor(isEmphasized);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (dieRef.current) {
      const burst = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
      (dieRef.current.material as MeshStandardMaterial).emissiveIntensity =
        base * (0.6 + burst * 0.9);
    }
    if (ringRef.current) ringRef.current.rotation.z -= delta * 0.9;
  });

  const pins = PIN_OFFSETS.flatMap((o) => [
    { p: [o, -0.05, 0.4], s: [0.04, 0.03, 0.1] },
    { p: [o, -0.05, -0.4], s: [0.04, 0.03, 0.1] },
    { p: [0.4, -0.05, o], s: [0.1, 0.03, 0.04] },
    { p: [-0.4, -0.05, o], s: [0.1, 0.03, 0.04] },
  ]);

  return (
    <group scale={scale} rotation={[0.35, 0, 0]}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <boxGeometry args={[0.72, 0.08, 0.72]} />
        <Panel opacity={bodyOpacity} />
        <Outline show={isEmphasized} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.46]} />
        <Metal opacity={bodyOpacity} />
      </mesh>
      <mesh ref={dieRef} position={[0, 0.105, 0]}>
        <boxGeometry args={[0.2, 0.012, 0.2]} />
        <Glow opacity={bodyOpacity} intensity={base} />
      </mesh>
      {pins.map((pin, i) => (
        <mesh key={i} position={pin.p as [number, number, number]}>
          <boxGeometry args={pin.s as [number, number, number]} />
          <Metal opacity={bodyOpacity} />
        </mesh>
      ))}
      <mesh ref={ringRef} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.006, 6, 64, Math.PI * 1.2]} />
        <Glow opacity={bodyOpacity} intensity={base} />
      </mesh>
    </group>
  );
}
