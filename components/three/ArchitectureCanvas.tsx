"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, QuadraticBezierLine } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import designTokens from "@/lib/design-tokens.json";
import { COLOR, flowColor } from "@/lib/architecture-colors";
import {
  sceneNodes,
  sceneEdges,
  type SceneNode,
} from "@/lib/architecture-scene";
import { architectureFlows } from "@/lib/architecture-flows";
import {
  STEP_TRAVEL_MS,
  STEP_TOTAL_MS,
  type PlaybackState,
} from "@/lib/hooks/use-flow-playback";
import { NodeVisualDispatcher } from "@/components/three/nodes/NodeVisualDispatcher";

const DOLLY_MS = 350;
const DEFAULT_CAMERA_POS: [number, number, number] = [4.6, 3.1, 6.2];
const EXPANDED_NODE_SCALE = 1.08;
const FLASH_MS = 400;
// Rest-state size bump for legibility - satellites get a bigger boost since
// their geometry is intentionally smaller than the hub's (spec Section 1.2);
// the hub only needs a modest nudge since it already reads as the largest
// element. Kept modest (vs. an earlier 1.5x pass) so satellites don't
// collide with each other or the bottom button bar.
const BASE_HUB_SCALE = 1.05;
const BASE_SATELLITE_SCALE = 1.2;

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Derived, per-frame-cheap snapshot of the active flow step - recomputed
// only when the playback state object changes (a couple of times per
// second at most), never per render frame. Edge/Node components read the
// raw stepStartTime themselves inside useFrame/useEffect to drive smooth
// interpolation, so this object itself never needs to update faster than
// the step boundary.
type FlowRuntime = {
  flowId: string | null;
  stepKey: string;
  stepStartTime: number | null;
  activeFrom: string | null;
  activeTo: string | null;
  caption: string | null;
  colorHex: string | null;
};

function useFlowRuntime(playback: PlaybackState): FlowRuntime {
  return useMemo(() => {
    if (playback.activeFlowId === null || playback.activeStepIndex === null) {
      return {
        flowId: null,
        stepKey: "idle",
        stepStartTime: null,
        activeFrom: null,
        activeTo: null,
        caption: null,
        colorHex: null,
      };
    }
    const flow = architectureFlows.find((f) => f.id === playback.activeFlowId);
    const step = flow?.steps[playback.activeStepIndex] ?? null;
    return {
      flowId: playback.activeFlowId,
      stepKey: `${playback.activeFlowId}-${playback.activeStepIndex}`,
      stepStartTime: playback.stepStartTime,
      activeFrom: step?.edgeFrom ?? null,
      activeTo: step?.edgeTo ?? null,
      caption: step?.caption ?? null,
      colorHex: flow ? flowColor(flow.colorToken) : null,
    };
  }, [playback.activeFlowId, playback.activeStepIndex, playback.stepStartTime]);
}

type SharedProps = {
  hoveredId: string | null;
  selectedId: string | null;
  expandedId: string | null;
  onHoverChange: (id: string | null) => void;
  onSelect: (node: SceneNode) => void;
  onNavigate: (slug: string) => void;
  onBackgroundClick: () => void;
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

function ExpandPanel({
  node,
  expanded,
  onNavigate,
}: {
  node: SceneNode;
  expanded: boolean;
  onNavigate: (slug: string) => void;
}) {
  const [mounted, setMounted] = useState(expanded);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      const t = setTimeout(() => setShown(true), 10);
      return () => clearTimeout(t);
    }
    setShown(false);
    // Collapse is snappier than expand (duration-fast vs duration-base,
    // spec Section 3.3) - keep the panel mounted just long enough for its
    // own exit transition to finish before unmounting.
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [expanded]);

  if (!mounted) return null;

  return (
    <Html position={[0.9, 0.3, 0]} distanceFactor={7} style={{ pointerEvents: "none" }}>
      <div
        className="w-56 rounded-md border border-border bg-bg/95 p-4 font-mono text-[11px] normal-case tracking-normal backdrop-blur"
        style={{
          pointerEvents: "auto",
          opacity: shown ? 1 : 0,
          transform: shown ? "translateX(0)" : "translateX(-8px)",
          transition: shown
            ? `opacity ${designTokens.motion["duration-base"]} ${designTokens.motion["ease-out-expo"]}, transform ${designTokens.motion["duration-base"]} ${designTokens.motion["ease-out-expo"]}`
            : "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        <div className="mb-2 text-xs uppercase tracking-wide text-text-primary">
          {node.label}
        </div>
        <p className="text-text-secondary">{node.description}</p>
        {node.caseStudySlug && (
          <button
            type="button"
            className="mt-3 text-text-primary underline decoration-dotted underline-offset-4 transition-colors hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(node.caseStudySlug!);
            }}
          >
            View case study →
          </button>
        )}
      </div>
    </Html>
  );
}

function Node({
  node,
  hoveredId,
  selectedId,
  expandedId,
  onHoverChange,
  onSelect,
  onNavigate,
  flow,
}: SharedProps & { node: SceneNode; flow: FlowRuntime }) {
  const active = hoveredId ?? selectedId;
  const highlighted = connectedIds(active);
  const isDimmed = active !== null && !highlighted.has(node.id);
  const expanded = expandedId === node.id;

  const [isFlashing, setIsFlashing] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const prevStepKeyRef = useRef("idle");

  useEffect(() => {
    if (flow.stepKey === prevStepKeyRef.current) return;
    prevStepKeyRef.current = flow.stepKey;
    if (flow.activeTo !== node.id || !flow.caption) return;

    const arriveTimer = setTimeout(() => {
      setIsFlashing(true);
      setCaptionText(flow.caption!);
      setCaptionVisible(true);
    }, STEP_TRAVEL_MS);
    const flashEndTimer = setTimeout(() => {
      setIsFlashing(false);
    }, STEP_TRAVEL_MS + FLASH_MS);
    const captionEndTimer = setTimeout(() => {
      setCaptionVisible(false);
    }, STEP_TOTAL_MS);

    return () => {
      clearTimeout(arriveTimer);
      clearTimeout(flashEndTimer);
      clearTimeout(captionEndTimer);
      setIsFlashing(false);
    };
  }, [flow.stepKey, flow.activeTo, flow.caption, node.id]);

  const isEmphasized =
    hoveredId === node.id || selectedId === node.id || isFlashing;

  const groupRef = useRef<THREE.Group>(null);
  const restScale = node.isHub ? BASE_HUB_SCALE : BASE_SATELLITE_SCALE;
  const expandedTarget = (expanded ? EXPANDED_NODE_SCALE : 1) * restScale;
  useFrame(() => {
    if (!groupRef.current) return;
    const next = THREE.MathUtils.lerp(
      groupRef.current.scale.x,
      expandedTarget,
      0.15,
    );
    groupRef.current.scale.setScalar(next);
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHoverChange(node.id);
    document.body.style.cursor = "pointer";
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (hoveredId === node.id) onHoverChange(null);
    document.body.style.cursor = "auto";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(node);
  };

  // Body color is always "signal" (near-white) now, at rest and emphasized
  // alike - emphasis is conveyed by each node's own emissive glow (already
  // wired to isEmphasized in every components/three/nodes/*.tsx file), not
  // by swapping the diffuse color. Keeps the scene reading as bright/solid
  // rather than a grey-vs-white toggle.
  const color = COLOR.signal;
  const opacity = isDimmed ? 0.35 : 1;

  return (
    <group position={node.position}>
      <group ref={groupRef}>
        <NodeVisualDispatcher
          node={node}
          color={color}
          bodyOpacity={opacity}
          isEmphasized={isEmphasized}
          isDimmed={isDimmed}
          scale={1}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={handleClick}
        />
      </group>
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
      {captionVisible && (
        <Html
          center
          distanceFactor={8}
          position={[0, 0.55, 0]}
          style={{
            pointerEvents: "none",
            opacity: captionVisible ? 1 : 0,
            transition: `opacity ${designTokens.motion["duration-fast"]} ease`,
          }}
        >
          <div
            className="whitespace-nowrap rounded-sm bg-bg/80 px-1.5 py-0.5 font-mono text-[9px] tracking-wide"
            style={{ color: flow.colorHex ?? COLOR.signal }}
          >
            {captionText}
          </div>
        </Html>
      )}
      <ExpandPanel node={node} expanded={expanded} onNavigate={onNavigate} />
    </group>
  );
}

function Edge({
  from,
  to,
  control,
  hoveredId,
  selectedId,
  flow,
}: {
  from: SceneNode;
  to: SceneNode;
  control: [number, number, number];
  flow: FlowRuntime;
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
  const isHoverActive = active === from.id || active === to.id;
  const hoverDimmed = active !== null && !isHoverActive;

  const isFlowStepEdge =
    flow.flowId !== null && flow.activeFrom === from.id && flow.activeTo === to.id;
  const flowPlaying = flow.flowId !== null;

  // Offset per-edge start phase (deterministic from endpoint ids) so all
  // eight ambient pulses don't travel in lockstep - purely cosmetic variety.
  const phase = useMemo(
    () => ((from.id.charCodeAt(0) + to.id.charCodeAt(0)) % 100) / 100,
    [from.id, to.id],
  );
  const periodMs = isHoverActive ? 1100 : 2200;

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    if (isFlowStepEdge && flow.stepStartTime !== null) {
      const elapsed = performance.now() - flow.stepStartTime;
      const t = Math.min(elapsed / STEP_TRAVEL_MS, 1);
      pulseRef.current.position.copy(curve.getPoint(t));
      return;
    }
    const t = ((clock.elapsedTime * 1000) / periodMs + phase) % 1;
    pulseRef.current.position.copy(curve.getPoint(t));
  });

  const lineColor = isFlowStepEdge
    ? flow.colorHex ?? COLOR.signal
    : isHoverActive
      ? COLOR.signal
      : COLOR.border;
  const lineWidth = isFlowStepEdge ? 2.2 : isHoverActive ? 1.6 : 1;
  const lineOpacity = flowPlaying
    ? isFlowStepEdge
      ? 0.9
      : 0.15
    : hoverDimmed
      ? 0.25
      : 0.8;

  const pulseColor = isFlowStepEdge
    ? flow.colorHex ?? COLOR.signal
    : isHoverActive
      ? COLOR.signal
      : COLOR.signalDim;
  const pulseOpacity = flowPlaying
    ? isFlowStepEdge
      ? 1
      : 0.15
    : hoverDimmed
      ? 0.2
      : 0.9;

  return (
    <>
      <QuadraticBezierLine
        start={from.position}
        end={to.position}
        mid={control}
        color={lineColor}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color={pulseColor} transparent opacity={pulseOpacity} />
      </mesh>
    </>
  );
}

function OrbitGroup(props: SharedProps & { flow: FlowRuntime }) {
  const groupRef = useRef<THREE.Group>(null);
  const idleYRef = useRef(0);
  const tiltXRef = useRef(0);
  const tiltYRef = useRef(0);
  const paused = props.hoveredId !== null || props.selectedId !== null;

  useFrame(({ pointer }, delta) => {
    if (!groupRef.current) return;
    if (!paused) idleYRef.current += delta * 0.12;
    // Subtle mouse-parallax tilt (spec Section 4.3) - additive on top of the
    // idle rotation, never a substitute for it, and kept small (<=~0.08rad)
    // so it reads as ambient depth, not a drag-to-rotate control.
    tiltXRef.current = THREE.MathUtils.lerp(tiltXRef.current, pointer.y * 0.08, 0.05);
    tiltYRef.current = THREE.MathUtils.lerp(tiltYRef.current, pointer.x * 0.08, 0.05);
    groupRef.current.rotation.x = tiltXRef.current;
    groupRef.current.rotation.y = idleYRef.current + tiltYRef.current;
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
          flow={props.flow}
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
      // Arrival no longer auto-navigates (spec Section 3.2.3) - the click-
      // to-expand panel's own "View case study" button is the only
      // navigation trigger now. onDollyComplete is kept as a hook for
      // arrival-timed behavior other than navigation.
      if (node) onDollyComplete(node);
    }
  });

  return null;
}

type ArchitectureCanvasProps = SharedProps & {
  playback: PlaybackState;
  onDollyComplete: (node: SceneNode) => void;
  onMounted?: () => void;
};

export default function ArchitectureCanvas({
  onMounted,
  playback,
  ...props
}: ArchitectureCanvasProps) {
  // Fires once, after this (heavy, dynamically-imported) component has
  // actually mounted - the gating wrapper uses this to know it's safe to
  // hide the static-grid fallback without a gap where neither is visible.
  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  const flow = useFlowRuntime(playback);

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POS, fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={props.onBackgroundClick}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 5, 3]} intensity={0.9} />
      <directionalLight position={[-3, -2, -4]} intensity={0.25} />
      <OrbitGroup {...props} flow={flow} />
      <CameraRig
        selectedId={props.selectedId}
        onDollyComplete={props.onDollyComplete}
      />
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.2}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
