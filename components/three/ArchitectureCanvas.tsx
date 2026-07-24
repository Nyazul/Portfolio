"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, QuadraticBezierLine, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import designTokens from "@/lib/design-tokens.json";
import {
  sceneNodes,
  sceneEdges,
  type SceneNode,
} from "@/lib/architecture-scene";

const COLOR = {
  graphite: designTokens.color["bg-elevated"],
  surface: designTokens.color.surface,
  border: designTokens.color.border,
  signal: designTokens.color.signal,
  signalDim: designTokens.color["signal-dim"],
  textTertiary: designTokens.color["text-tertiary"],
};

const DOLLY_MS = 350;
const DEFAULT_CAMERA_POS: [number, number, number] = [4.6, 3.1, 6.2];

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

type SharedProps = {
  hoveredId: string | null;
  selectedId: string | null;
  onHoverChange: (id: string | null) => void;
  onSelect: (node: SceneNode) => void;
};

function connectedIds(id: string | null): Set<string> {
  if (!id) return new Set();
  const set = new Set<string>([id]);
  for (const edge of sceneEdges) {
    if (edge.from === id) set.add(edge.to);
    if (edge.to === id) set.add(edge.from);
  }
  return set;
}

function Node({
  node,
  hoveredId,
  selectedId,
  onHoverChange,
  onSelect,
}: SharedProps & { node: SceneNode }) {
  const active = hoveredId ?? selectedId;
  const highlighted = connectedIds(active);
  const isDimmed = active !== null && !highlighted.has(node.id);
  const isEmphasized = hoveredId === node.id || selectedId === node.id;
  const clickable = node.caseStudySlug !== null;

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHoverChange(node.id);
    if (clickable) document.body.style.cursor = "pointer";
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    // Guard against a stale "out" firing after hover has already moved to
    // a different node (can happen with fast pointer movement across
    // adjacent meshes) - only clear if we're still the active hover.
    if (hoveredId === node.id) onHoverChange(null);
    document.body.style.cursor = "auto";
  };

  const color = isEmphasized ? COLOR.signal : COLOR.graphite;
  const opacity = isDimmed ? 0.35 : 1;

  return (
    <group position={node.position}>
      {node.isHub ? (
        <mesh
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node);
          }}
        >
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial
            color={color}
            roughness={0.55}
            metalness={0.1}
            transparent
            opacity={opacity}
            emissive={isEmphasized ? COLOR.signal : "#000000"}
            emissiveIntensity={isEmphasized ? 0.15 : 0}
          />
        </mesh>
      ) : (
        <RoundedBox
          args={[0.85, 0.55, 0.55]}
          radius={0.08}
          smoothness={4}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect(node);
          }}
        >
          <meshStandardMaterial
            color={color}
            roughness={0.6}
            metalness={0.08}
            transparent
            opacity={opacity}
            emissive={isEmphasized ? COLOR.signal : "#000000"}
            emissiveIntensity={isEmphasized ? 0.18 : 0}
          />
        </RoundedBox>
      )}
      <Html
        center
        distanceFactor={8}
        style={{
          pointerEvents: "none",
          opacity: isDimmed ? 0.35 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <div
          className="whitespace-nowrap font-mono text-[10px] tracking-wide"
          style={{ color: isEmphasized ? COLOR.signal : COLOR.textTertiary }}
        >
          {node.label}
        </div>
      </Html>
    </group>
  );
}

function Edge({
  from,
  to,
  control,
  hoveredId,
  selectedId,
}: {
  from: SceneNode;
  to: SceneNode;
  control: [number, number, number];
} & Pick<SharedProps, "hoveredId" | "selectedId">) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...from.position),
        new THREE.Vector3(...control),
        new THREE.Vector3(...to.position),
      ),
    [from.position, to.position, control],
  );

  const active = hoveredId ?? selectedId;
  const isActiveEdge = active === from.id || active === to.id;
  const dimmed = active !== null && !isActiveEdge;

  // Offset per-edge start phase (deterministic from endpoint ids) so all
  // eight pulses don't travel in lockstep - purely cosmetic variety.
  const phase = useMemo(
    () => ((from.id.charCodeAt(0) + to.id.charCodeAt(0)) % 100) / 100,
    [from.id, to.id],
  );
  const periodMs = isActiveEdge ? 1100 : 2200;

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const t = ((clock.elapsedTime * 1000) / periodMs + phase) % 1;
    const p = curve.getPoint(t);
    pulseRef.current.position.copy(p);
  });

  return (
    <>
      <QuadraticBezierLine
        start={from.position}
        end={to.position}
        mid={control}
        color={isActiveEdge ? COLOR.signal : COLOR.border}
        lineWidth={isActiveEdge ? 1.6 : 1}
        transparent
        opacity={dimmed ? 0.25 : 0.8}
      />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial
          color={isActiveEdge ? COLOR.signal : COLOR.signalDim}
          transparent
          opacity={dimmed ? 0.2 : 0.9}
        />
      </mesh>
    </>
  );
}

function OrbitGroup(props: SharedProps) {
  const groupRef = useRef<THREE.Group>(null);
  const paused = props.hoveredId !== null || props.selectedId !== null;

  useFrame((_, delta) => {
    if (!groupRef.current || paused) return;
    groupRef.current.rotation.y += delta * 0.12;
  });

  const nodeById = useMemo(() => new Map(sceneNodes.map((n) => [n.id, n])), []);

  return (
    <group ref={groupRef}>
      {sceneEdges.map((edge) => (
        <Edge
          key={`${edge.from}-${edge.to}`}
          from={nodeById.get(edge.from)!}
          to={nodeById.get(edge.to)!}
          control={edge.control}
          hoveredId={props.hoveredId}
          selectedId={props.selectedId}
        />
      ))}
      {sceneNodes.map((node) => (
        <Node key={node.id} node={node} {...props} />
      ))}
    </group>
  );
}

function CameraRig({
  selectedId,
  onDollyComplete,
}: {
  selectedId: string | null;
  onDollyComplete: (node: SceneNode) => void;
}) {
  const startPos = useRef(new THREE.Vector3(...DEFAULT_CAMERA_POS));
  const targetPos = useRef(new THREE.Vector3(...DEFAULT_CAMERA_POS));
  const startTime = useRef<number | null>(null);
  const firedRef = useRef(false);
  const prevSelected = useRef<string | null>(null);

  useFrame(({ camera }, delta) => {
    if (selectedId !== prevSelected.current) {
      prevSelected.current = selectedId;
      startPos.current.copy(camera.position);
      startTime.current = 0;
      firedRef.current = false;

      if (selectedId) {
        const node = sceneNodes.find((n) => n.id === selectedId);
        if (node) {
          const dir = new THREE.Vector3(...node.position).normalize();
          targetPos.current
            .set(...node.position)
            .add(dir.multiplyScalar(1.6))
            .add(new THREE.Vector3(0, 0.4, 0.6));
        }
      } else {
        targetPos.current.set(...DEFAULT_CAMERA_POS);
      }
    }

    if (startTime.current === null) return;
    startTime.current += delta * 1000;
    const t = Math.min(startTime.current / DOLLY_MS, 1);
    const eased = easeOutExpo(t);
    camera.position.lerpVectors(startPos.current, targetPos.current, eased);
    camera.lookAt(0, 0, 0);

    if (t >= 1 && !firedRef.current && selectedId) {
      firedRef.current = true;
      const node = sceneNodes.find((n) => n.id === selectedId);
      if (node?.caseStudySlug) onDollyComplete(node);
    }
  });

  return null;
}

type ArchitectureCanvasProps = SharedProps & {
  onDollyComplete: (node: SceneNode) => void;
  onMounted?: () => void;
};

export default function ArchitectureCanvas({
  onMounted,
  ...props
}: ArchitectureCanvasProps) {
  // Fires once, after this (heavy, dynamically-imported) component has
  // actually mounted - the gating wrapper uses this to know it's safe to
  // hide the static-grid fallback without a gap where neither is visible.
  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POS, fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 5, 3]} intensity={0.9} />
      <directionalLight position={[-3, -2, -4]} intensity={0.25} />
      <OrbitGroup {...props} />
      <CameraRig
        selectedId={props.selectedId}
        onDollyComplete={props.onDollyComplete}
      />
    </Canvas>
  );
}
