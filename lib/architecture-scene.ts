import { architectureNodes, type NodeVisual } from "@/lib/architecture-nodes";

export type Vec3 = [number, number, number];

export type SceneNode = {
  id: string;
  label: string;
  description: string;
  caseStudySlug: string | null;
  position: Vec3;
  // App Server is the fixed hub - larger, non-orbiting, not a click target.
  isHub: boolean;
  visual: NodeVisual;
};

export type SceneEdge = {
  from: string;
  to: string;
  // Control point for the drei QuadraticBezierLine - lifted above the
  // straight from->to line so edges read as arcs ("data flow"), not
  // right-angle pipes (PRD 6.3).
  control: Vec3;
};

// Computed once at module load, not per-frame and not inline in the R3F
// component - PRD 7.3 requires the scene to be data-driven, never
// hardcoded node positions in component code. Generating the ring here
// (rather than hand-typing 7 vectors) still keeps this a pure data module -
// SceneCanvas just imports the resulting arrays - while guaranteeing even
// spacing and giving one lever (radius/tilt) to retune the whole layout.
function ringPosition(
  index: number,
  count: number,
  radius: number,
  tiltDeg: number,
  yJitter: number,
): Vec3 {
  const angle = (index / count) * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const flatZ = Math.sin(angle) * radius;
  const tilt = (tiltDeg * Math.PI) / 180;
  const y = flatZ * Math.sin(tilt) + yJitter;
  const z = flatZ * Math.cos(tilt);
  return [x, y, z];
}

const RADIUS = 2.9;
const TILT_DEG = 18;
// Alternate a little extra elevation per satellite so the ring reads as
// "orbiting arcs" rather than a flat wheel when the idle rotation is
// paused mid-turn - purely a visual variation, not meaningful data.
const Y_JITTER = [0.5, -0.4, 0.35, -0.55, 0.3, -0.3, 0.5];

const orbitOrder = architectureNodes.filter((n) => n.id !== "app-server");
const hubNode = architectureNodes.find((n) => n.id === "app-server")!;

export const sceneNodes: SceneNode[] = [
  {
    id: hubNode.id,
    label: hubNode.label,
    description: hubNode.description,
    caseStudySlug: hubNode.caseStudySlug,
    position: [0, 0, 0],
    isHub: true,
    visual: hubNode.visual,
  },
  ...orbitOrder.map((node, i) => ({
    id: node.id,
    label: node.label,
    description: node.description,
    caseStudySlug: node.caseStudySlug,
    position: ringPosition(
      i,
      orbitOrder.length,
      RADIUS,
      TILT_DEG,
      Y_JITTER[i] ?? 0,
    ),
    isHub: false,
    visual: node.visual,
  })),
];

const nodeById = new Map(sceneNodes.map((n) => [n.id, n]));

function midpointLifted(fromId: string, toId: string, lift: number): Vec3 {
  const a = nodeById.get(fromId)!.position;
  const b = nodeById.get(toId)!.position;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + lift, (a[2] + b[2]) / 2];
}

const edgePairs: [string, string][] = [
  ["api-layer", "app-server"],
  ["app-server", "queue"],
  ["app-server", "cache"],
  ["app-server", "database"],
  ["app-server", "storage"],
  ["app-server", "workers"],
  ["workers", "monitoring"],
  ["queue", "workers"],
];

export const sceneEdges: SceneEdge[] = edgePairs.map(([from, to]) => ({
  from,
  to,
  control: midpointLifted(from, to, 0.9),
}));
