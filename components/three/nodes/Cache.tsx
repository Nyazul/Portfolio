"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";
import { Glow, glowFor } from "./materials";

// cache - a faceted crystal shell (ephemeral, see-through) around a hot,
// fast-pulsing orange core, with two electrons whipping round on tilted
// orbits - "fast, in-memory".
export function Cache({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const coreRef = useRef<Mesh>(null);
  const shellRef = useRef<Mesh>(null);
  const orbitRefs = useRef<(Group | null)[]>([]);
  const glow = glowFor(isEmphasized);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (coreRef.current) coreRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    if (shellRef.current) {
      shellRef.current.rotation.y += delta * 0.25;
      shellRef.current.rotation.x += delta * 0.1;
    }
    orbitRefs.current.forEach((g, i) => {
      if (g) g.rotation.y = t * (2.4 + i * 0.9);
    });
  });

  return (
    <group scale={scale}>
      <mesh
        ref={shellRef}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <icosahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial
          color={COLOR.metal}
          metalness={0.6}
          roughness={0.15}
          transparent
          opacity={0.14 * bodyOpacity}
          depthWrite={false}
          flatShading
        />
        <Edges
          threshold={1}
          color={isEmphasized ? COLOR.accent : COLOR.metal}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.13, 1]} />
        <Glow opacity={bodyOpacity} intensity={glow} />
      </mesh>
      {[0.5, -0.9].map((tilt, i) => (
        <group key={tilt} rotation={[tilt, 0, tilt * 0.6]}>
          <group
            ref={(g) => {
              orbitRefs.current[i] = g;
            }}
          >
            <mesh position={[0.46, 0, 0]}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <Glow opacity={bodyOpacity} intensity={glow} />
            </mesh>
          </group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.46, 0.003, 4, 64]} />
            <meshBasicMaterial color={COLOR.metal} transparent opacity={0.3 * bodyOpacity} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
