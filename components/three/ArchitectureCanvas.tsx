"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Environment,
  Grid,
  Html,
  Lightformer,
  OrbitControls,
  QuadraticBezierLine,
  Sparkles,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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

// Click-to-focus: instead of dollying right up to a node (which also blew
// the distance-scaled detail panel up to an unreadable size), the camera
// swings round so the node faces it and eases in only modestly.
const FOCUS_MS = 900;
const DEFAULT_CAMERA_POS: [number, number, number] = [5.8, 3.7, 7.9];
const DEFAULT_DISTANCE = Math.hypot(...DEFAULT_CAMERA_POS);
const FOCUS_DISTANCE = 7.4;
// How far the orbit target moves toward the focused node (0 = stay on the
// hub, 1 = center on the node) - partial keeps the system in frame.
const FOCUS_TARGET_PULL = 0.45;
const FOCUS_ELEVATION = 0.42; // rad above the horizon when focused
const EXPANDED_NODE_SCALE = 1.08;
const FLASH_MS = 400;
// Rest-state size bump for legibility - satellites get a bigger boost since
// their geometry is intentionally smaller than the hub's (spec Section 1.2);
// the hub only needs a modest nudge since it already reads as the largest
// element. Kept modest (vs. an earlier 1.5x pass) so satellites don't
// collide with each other or the bottom button bar.
const BASE_HUB_SCALE = 1.05;
const BASE_SATELLITE_SCALE = 1.2;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    <Html
      position={[0.75, 0.45, 0]}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="w-64 rounded-lg border border-border border-t-2 border-t-accent bg-bg/90 p-4 font-mono text-[11px] normal-case tracking-normal shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
        style={{
          pointerEvents: "auto",
          opacity: shown ? 1 : 0,
          transform: shown ? "translateX(0)" : "translateX(-8px)",
          transition: shown
            ? `opacity ${designTokens.motion["duration-base"]} ${designTokens.motion["ease-out-expo"]}, transform ${designTokens.motion["duration-base"]} ${designTokens.motion["ease-out-expo"]}`
            : "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {node.label}
        </div>
        <p className="leading-relaxed text-text-secondary">{node.description}</p>
        {node.caseStudySlug && (
          <button
            type="button"
            className="mt-3 text-accent underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
        position={[0, node.isHub ? -1.05 : -0.72, 0]}
        distanceFactor={8}
        zIndexRange={[30, 0]}
        style={{
          pointerEvents: "none",
          opacity: isDimmed ? 0.35 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <div
          className="whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide backdrop-blur-sm"
          style={{
            color: isEmphasized ? COLOR.accent : COLOR.signalDim,
            borderColor: isEmphasized ? COLOR.accent : "rgba(255,255,255,0.08)",
            background: "rgba(10,10,10,0.55)",
          }}
        >
          {node.label}
        </div>
      </Html>
      {captionVisible && (
        <Html
          center
          distanceFactor={8}
          zIndexRange={[30, 0]}
          position={[0, 0.75, 0]}
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
    ? flow.colorHex ?? COLOR.accent
    : isHoverActive
      ? COLOR.accent
      : "#3A3A3A";
  const lineWidth = isFlowStepEdge ? 2.2 : isHoverActive ? 1.6 : 1;
  const lineOpacity = flowPlaying
    ? isFlowStepEdge
      ? 0.9
      : 0.15
    : hoverDimmed
      ? 0.25
      : 0.8;

  const pulseColor = isFlowStepEdge ? flow.colorHex ?? COLOR.accent : COLOR.accent;
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
        <sphereGeometry args={[isFlowStepEdge ? 0.07 : 0.045, 12, 12]} />
        <meshBasicMaterial
          color={pulseColor}
          transparent
          opacity={pulseOpacity}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

// Rotation now belongs to the camera (OrbitControls: drag to rotate, slow
// auto-rotate at rest), not to this group - so node world positions equal
// their data positions, which the focus rig relies on.
function OrbitGroup(props: SharedProps & { flow: FlowRuntime }) {
  const groupRef = useRef<THREE.Group>(null);

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
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const prevSelected = useRef<string | null>(null);
  const anim = useRef<{
    t: number;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromDir: THREE.Vector3;
    toDir: THREE.Vector3;
    fromDist: number;
    toDist: number;
    node: SceneNode | null;
  } | null>(null);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, delta) => {
    if (!controls) return;

    if (selectedId !== prevSelected.current) {
      prevSelected.current = selectedId;
      const node = selectedId
        ? sceneNodes.find((n) => n.id === selectedId) ?? null
        : null;
      const fromDir = camera.position.clone().sub(controls.target).normalize();
      let toDir = fromDir.clone();
      let toTarget = new THREE.Vector3(0, 0, 0);
      if (node && !node.isHub) {
        const p = new THREE.Vector3(...node.position);
        // Swing round to the node's side so it faces the camera.
        const flat = new THREE.Vector3(p.x, 0, p.z).normalize();
        toDir = flat
          .multiplyScalar(Math.cos(FOCUS_ELEVATION))
          .add(new THREE.Vector3(0, Math.sin(FOCUS_ELEVATION), 0))
          .normalize();
        toTarget = p.multiplyScalar(FOCUS_TARGET_PULL);
      }
      anim.current = {
        t: 0,
        fromTarget: controls.target.clone(),
        toTarget,
        fromDir,
        toDir,
        fromDist: camera.position.distanceTo(controls.target),
        toDist: node ? FOCUS_DISTANCE : DEFAULT_DISTANCE,
        node,
      };
    }

    const a = anim.current;
    if (!a) return;
    a.t = Math.min(a.t + (delta * 1000) / FOCUS_MS, 1);
    const e = easeInOutCubic(a.t);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
    tmpDir.copy(a.fromDir).lerp(a.toDir, e).normalize();
    camera.position
      .copy(controls.target)
      .addScaledVector(tmpDir, THREE.MathUtils.lerp(a.fromDist, a.toDist, e));
    controls.update();

    if (a.t >= 1) {
      anim.current = null;
      if (a.node) onDollyComplete(a.node);
    }
  });

  return null;
}

// Studio lighting baked into an environment map from a few Lightformers -
// no HDRI download - so the aluminium bodies get real reflections, with a
// warm accent-colored strip on one side.
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 5, -4]} scale={[10, 3, 1]} />
      <Lightformer
        form="rect"
        intensity={1.2}
        position={[-6, 1, 1]}
        rotation-y={Math.PI / 2}
        scale={[8, 2, 1]}
      />
      <Lightformer
        form="rect"
        color={COLOR.accent}
        intensity={1.4}
        position={[6, 0, 2]}
        rotation-y={-Math.PI / 2}
        scale={[8, 1.5, 1]}
      />
      <Lightformer form="ring" intensity={0.8} position={[0, -4, 4]} scale={4} />
    </Environment>
  );
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
  // Auto-rotate pauses while the visitor is looking at something.
  const paused = props.hoveredId !== null || props.selectedId !== null;

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POS, fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={props.onBackgroundClick}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />
      <directionalLight position={[-3, -2, -4]} intensity={0.3} />
      <pointLight position={[0, 0.2, 0]} color={COLOR.accent} intensity={2.5} distance={4} />
      <Studio />
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        autoRotate={!paused}
        autoRotateSpeed={0.5}
        minPolarAngle={0.35}
        maxPolarAngle={1.45}
      />
      <Grid
        position={[0, -1.7, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1c1c1c"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#2e2e2e"
        fadeDistance={16}
        fadeStrength={1.5}
        infiniteGrid
      />
      <Sparkles
        count={70}
        scale={[10, 4, 10]}
        size={1.6}
        speed={0.25}
        opacity={0.5}
        color={COLOR.accent}
      />
      <OrbitGroup {...props} flow={flow} />
      <CameraRig
        selectedId={props.selectedId}
        onDollyComplete={props.onDollyComplete}
      />
      <EffectComposer>
        <Bloom
          intensity={0.85}
          luminanceThreshold={1}
          luminanceSmoothing={0.15}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
