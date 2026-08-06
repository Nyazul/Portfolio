"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

const RING_Y = [-0.15, 0, 0.15];
const RING_SPEED = [0.6, 0.9, 1.2]; // rad/s, deliberately distinct per ring

// queue - cylinder body with 3 small rotating discs inside, implying items
// in transit. The inner rotations run always (spec Section 1.2) - they
// represent "queue has items," not "queue is selected" - so they're driven
// by useFrame unconditionally, independent of hover/select/dim state; the
// dimmed state only reduces their opacity, never stops them.
export function Queue({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const ringRefs = [
    useRef<Mesh>(null),
    useRef<Mesh>(null),
    useRef<Mesh>(null),
  ];

  useFrame((_, delta) => {
    ringRefs.forEach((ref, i) => {
      if (ref.current) ref.current.rotation.y += delta * RING_SPEED[i];
    });
  });

  return (
    <group scale={scale}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <cylinderGeometry args={[0.28, 0.28, 0.62, 16]} />
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
      {RING_Y.map((y, i) => (
        <mesh key={y} ref={ringRefs[i]} position={[0, y, 0]}>
          <torusGeometry args={[0.2, 0.02, 6, 16]} />
          <meshBasicMaterial
            color={COLOR.signalDim}
            transparent
            opacity={bodyOpacity}
          />
        </mesh>
      ))}
    </group>
  );
}
