"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Mesh } from "three";
import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

const SWEEP_SPEED = 1; // rad/s, always running - a literal radar sweep

// monitoring - a flat base with a thin rotating sweep wedge on top, reading
// as a literal radar sweep. The sweep runs continuously (spec Section 1.2).
export function Monitor({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const sweepRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (sweepRef.current) sweepRef.current.rotation.z += delta * SWEEP_SPEED;
  });

  const sweepColor = isEmphasized ? COLOR.signal : COLOR.signalDim;
  const sweepOpacity = (isEmphasized ? 0.8 : 0.5) * bodyOpacity;

  return (
    <group scale={scale}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <cylinderGeometry args={[0.34, 0.34, 0.05, 24]} />
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
      <mesh
        ref={sweepRef}
        position={[0, 0.03, 0]}
        rotation-x={-Math.PI / 2}
      >
        <circleGeometry args={[0.32, 24, 0, Math.PI / 6]} />
        <meshBasicMaterial
          color={sweepColor}
          transparent
          opacity={sweepOpacity}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
