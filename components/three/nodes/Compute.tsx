"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

const SATELLITE_RADIUS = 0.32;
const SATELLITE_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]; // 120° apart
const ORBIT_SPEED = 1.5; // rad/s, always running (spec Section 1.2)

// workers - a central cube with 3 tiny satellite cubes orbiting it, implying
// parallel worker processes. The orbit runs continuously, independent of
// scene idle rotation and hover state - it represents "active processing."
export function Compute({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const clusterRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (clusterRef.current) clusterRef.current.rotation.y += delta * ORBIT_SPEED;
  });

  return (
    <group scale={scale}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <boxGeometry args={[0.22, 0.22, 0.22]} />
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
      <group ref={clusterRef}>
        {SATELLITE_ANGLES.map((angle) => (
          <mesh
            key={angle}
            position={[
              Math.cos(angle) * SATELLITE_RADIUS,
              0,
              Math.sin(angle) * SATELLITE_RADIUS,
            ]}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial
              color={COLOR.signalDim}
              roughness={0.6}
              metalness={0.08}
              transparent
              opacity={bodyOpacity}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
