export type Point = { x: number; y: number }; // fractions 0..1, canvas-relative

function circlePoints(cx: number, cy: number, r: number, count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  count: number,
): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const a = startAngle + (endAngle - startAngle) * t;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

function linePoints(x1: number, y1: number, x2: number, y2: number, count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  });
}

function rectOutlinePoints(x: number, y: number, w: number, h: number, perSide: number): Point[] {
  return [
    ...linePoints(x, y, x + w, y, perSide),
    ...linePoints(x + w, y, x + w, y + h, perSide),
    ...linePoints(x + w, y + h, x, y + h, perSide),
    ...linePoints(x, y + h, x, y, perSide),
  ];
}

// Every shape below is an original, abstract mark built from primitives
// (circles/arcs/lines) - not a reproduction of any real logo or icon set.
// Computed once at module load, not per animation frame (same reasoning as
// the original node-graph: precomputed point cloud, cheap to reuse across
// however many particles cycle through it).

// Architecture: the node-graph hint, same shape used since the hero
// (PRD 7.2) - reused here as the Architecture section's own converge shape.
const archNodes = [
  { cx: 0.5, cy: 0.28 },
  { cx: 0.28, cy: 0.48 },
  { cx: 0.72, cy: 0.48 },
  { cx: 0.36, cy: 0.66 },
  { cx: 0.64, cy: 0.66 },
];
const archEdges: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 3],
  [2, 4],
];
export const nodeGraphPoints: Point[] = [
  ...archNodes.flatMap((n) => circlePoints(n.cx, n.cy, 0.035, 40)),
  ...archEdges.flatMap(([a, b]) =>
    linePoints(archNodes[a].cx, archNodes[a].cy, archNodes[b].cx, archNodes[b].cy, 30),
  ),
];

// About: a simple abstract avatar mark - head + shoulders.
const aboutShape: Point[] = [
  ...circlePoints(0.5, 0.35, 0.14, 60),
  ...arcPoints(0.5, 0.95, 0.32, Math.PI * 1.15, Math.PI * 1.85, 50),
];

// Case studies: a document mark - outline plus a few text lines.
const caseStudiesShape: Point[] = [
  ...rectOutlinePoints(0.32, 0.18, 0.36, 0.56, 20),
  ...linePoints(0.4, 0.32, 0.6, 0.32, 14),
  ...linePoints(0.4, 0.44, 0.6, 0.44, 14),
  ...linePoints(0.4, 0.56, 0.53, 0.56, 10),
];

// Stack: a simple bar-chart mark.
const stackShape: Point[] = [
  ...linePoints(0.3, 0.68, 0.7, 0.68, 24),
  ...linePoints(0.36, 0.68, 0.36, 0.52, 16),
  ...linePoints(0.46, 0.68, 0.46, 0.4, 16),
  ...linePoints(0.56, 0.68, 0.56, 0.3, 16),
  ...linePoints(0.66, 0.68, 0.66, 0.46, 16),
];

// Experience: a simple timeline mark - a path with milestone nodes.
const experienceShape: Point[] = [
  ...linePoints(0.25, 0.5, 0.85, 0.5, 40),
  ...circlePoints(0.25, 0.5, 0.028, 16),
  ...circlePoints(0.55, 0.5, 0.028, 16),
  ...circlePoints(0.85, 0.5, 0.028, 16),
];

// Contact: a simple envelope mark.
const contactShape: Point[] = [
  ...rectOutlinePoints(0.28, 0.36, 0.44, 0.3, 20),
  ...linePoints(0.28, 0.36, 0.5, 0.54, 22),
  ...linePoints(0.72, 0.36, 0.5, 0.54, 22),
];

export const sectionShapes: Record<string, Point[]> = {
  about: aboutShape,
  architecture: nodeGraphPoints,
  work: caseStudiesShape,
  stack: stackShape,
  experience: experienceShape,
  contact: contactShape,
};
