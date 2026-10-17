"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";
import { Glow, Metal, Outline, glowFor } from "./materials";

const MESSAGES = 5;
const LENGTH = 0.84;

// queue - a horizontal glass tube with aluminium end collars and message
// blocks travelling through it FIFO; one block is lit, the message currently
// being handed to a consumer.
export function Queue({
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const msgRefs = useRef<(Group | null)[]>([]);
  const glow = glowFor(isEmphasized);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    msgRefs.current.forEach((g, i) => {
      if (!g) return;
      const p = (t * 0.18 + i / MESSAGES) % 1;
      g.position.x = -LENGTH / 2 + 0.06 + p * (LENGTH - 0.12);
      // Shrink in/out at the ends so blocks don't pop through the collars.
      g.scale.setScalar(Math.min(1, Math.sin(p * Math.PI) * 3));
    });
  });

  return (
    <group scale={scale}>
      <mesh
        rotation={[0, 0, Math.PI / 2]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <cylinderGeometry args={[0.2, 0.2, LENGTH, 32, 1, true]} />
        <meshStandardMaterial
          color={COLOR.panel}
          metalness={0.2}
          roughness={0.08}
          transparent
          opacity={0.38 * bodyOpacity}
          depthWrite={false}
        />
        <Outline show={isEmphasized} />
      </mesh>
      {[-LENGTH / 2, LENGTH / 2].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.2, 0.04, 12, 32]} />
          <Metal opacity={bodyOpacity} />
        </mesh>
      ))}
      {/* support feet */}
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, -0.27, 0]}>
          <boxGeometry args={[0.05, 0.14, 0.22]} />
          <Metal opacity={bodyOpacity} />
        </mesh>
      ))}
      {Array.from({ length: MESSAGES }).map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            msgRefs.current[i] = g;
          }}
        >
          <RoundedBox args={[0.11, 0.11, 0.11]} radius={0.02} smoothness={2}>
            {i === 0 ? (
              <Glow opacity={bodyOpacity} intensity={glow} />
            ) : (
              <Metal opacity={bodyOpacity} />
            )}
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}
