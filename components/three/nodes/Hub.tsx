"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, Panel, glowFor } from "./materials";

const BLADE_Y = [0.36, 0.12, -0.12, -0.36];

// app-server - a small server rack: aluminium chassis, four recessed blades
// each with its own status LED blinking out of phase, standing on a dark
// plinth circled by a slowly turning orange orbit ring.
export function Hub({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const ledRefs = useRef<(Mesh | null)[]>([]);
  const ringRef = useRef<Mesh>(null);
  const base = glowFor(isEmphasized);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    ledRefs.current.forEach((m, i) => {
      if (!m) return;
      const on = Math.sin(t * (2.2 + i * 0.7) + i * 1.9) > -0.2;
      (m.material as MeshStandardMaterial).emissiveIntensity = on ? base : 0.25;
    });
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.5;
  });

  return (
    <group scale={scale}>
      <RoundedBox
        args={[0.8, 1.1, 0.7]}
        radius={0.06}
        smoothness={4}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <Metal opacity={bodyOpacity} />
        <Outline show={isEmphasized} />
      </RoundedBox>
      {BLADE_Y.map((y, i) => (
        <group key={y} position={[0, y, 0.352]}>
          <mesh>
            <boxGeometry args={[0.66, 0.18, 0.02]} />
            <Panel opacity={bodyOpacity} />
          </mesh>
          {/* vent slots */}
          {[-0.2, -0.12, -0.04, 0.04].map((x) => (
            <mesh key={x} position={[x, 0, 0.011]}>
              <boxGeometry args={[0.035, 0.11, 0.004]} />
              <Metal opacity={bodyOpacity * 0.5} />
            </mesh>
          ))}
          <mesh
            ref={(m) => {
              ledRefs.current[i] = m;
            }}
            position={[0.24, 0, 0.014]}
          >
            <boxGeometry args={[0.1, 0.035, 0.01]} />
            <Glow opacity={bodyOpacity} intensity={base} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.62, 0.66, 0.06, 48]} />
        <Panel opacity={bodyOpacity} />
      </mesh>
      <mesh ref={ringRef} position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.008, 8, 96, Math.PI * 1.5]} />
        <Glow opacity={bodyOpacity} intensity={base} />
      </mesh>
    </group>
  );
}
