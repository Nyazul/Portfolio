"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { COLOR } from "@/lib/architecture-colors";
import type { NodeVisualProps } from "./types";

// cache - translucent outer sphere (always ~0.4 opacity, "ephemeral") plus
// an opaque inner core pulsing 0.9-1.1 scale on a fast ~0.8s sine cycle
// ("hot/fast"), always running regardless of hover/select/dim state (spec
// Section 1.2) - only the outer sphere's opacity blends with the dimmed
// state, the pulse itself never pauses.
export function Cache({
  color,
  bodyOpacity,
  isEmphasized,
  scale,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeVisualProps) {
  const coreRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!coreRef.current) return;
    const s = Math.sin(clock.elapsedTime * 4) * 0.1 + 1;
    coreRef.current.scale.setScalar(s);
  });

  // Outer sphere's own rest-opacity is 0.4 (spec Section 1.3); the dimmed
  // state multiplies on top of that so it never becomes *more* opaque than
  // an emphasized/rest cache would be.
  const outerOpacity = 0.4 * bodyOpacity;

  return (
    <group scale={scale}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.1}
          transparent
          opacity={outerOpacity}
          emissive={isEmphasized ? COLOR.signal : "#000000"}
          emissiveIntensity={isEmphasized ? 0.18 : 0}
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={COLOR.signalDim}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>
    </group>
  );
}
