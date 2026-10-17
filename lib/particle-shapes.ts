// x/y: fractions 0..1, canvas-relative. Optional z (centered on 0, same
// units as x - 0.5) marks a true 3D shape: ParticleSystem spins it about
// the vertical axis and sizes particles by depth.
export type Point = { x: number; y: number; z?: number };

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

// Architecture (3D): a wireframe globe - latitude rings and meridians - with
// a tilted orbit ring and three "service" clusters riding it. Reads as a
// distributed system, and because it carries depth it spins and shades.
function spherePoint(r: number, lat: number, lon: number): Point {
  return {
    x: 0.5 + r * Math.cos(lat) * Math.cos(lon),
    y: 0.5 - r * Math.sin(lat),
    z: r * Math.cos(lat) * Math.sin(lon),
  };
}
const GLOBE_R = 0.3;
const globeLatitudes = [-60, -30, 0, 30, 60].flatMap((deg) => {
  const lat = (deg * Math.PI) / 180;
  const n = Math.round(90 * Math.cos(lat));
  return Array.from({ length: n }, (_, i) =>
    spherePoint(GLOBE_R, lat, (i / n) * Math.PI * 2),
  );
});
const globeMeridians = Array.from({ length: 6 }, (_, m) => (m / 6) * Math.PI).flatMap(
  (lon) =>
    Array.from({ length: 70 }, (_, i) =>
      spherePoint(GLOBE_R, (i / 70) * Math.PI * 2, lon),
    ),
);
// Orbit: a circle of radius 0.44 in the xz-plane, tilted 22deg about x.
const ORBIT_TILT = (22 * Math.PI) / 180;
function orbitPoint(r: number, a: number): Point {
  const x = Math.cos(a) * r;
  const zFlat = Math.sin(a) * r;
  return {
    x: 0.5 + x,
    y: 0.5 - zFlat * Math.sin(ORBIT_TILT),
    z: zFlat * Math.cos(ORBIT_TILT),
  };
}
const globeOrbit = Array.from({ length: 140 }, (_, i) =>
  orbitPoint(0.44, (i / 140) * Math.PI * 2),
);
// Dense little clusters at three spots on the orbit - the "satellites".
const globeSatellites = [0.3, 2.4, 4.4].flatMap((a) =>
  Array.from({ length: 36 }, (_, i) => {
    const c = orbitPoint(0.44, a);
    const ang = (i / 36) * Math.PI * 2;
    const rr = 0.012 + (i % 3) * 0.008;
    return { x: c.x + Math.cos(ang) * rr, y: c.y + Math.sin(ang) * rr, z: c.z };
  }),
);
const globeShape: Point[] = [
  ...globeLatitudes,
  ...globeMeridians,
  ...globeOrbit,
  ...globeSatellites,
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
  ...linePoints(0.2, 0.58, 0.7, 0.58, 24),
  ...linePoints(0.26, 0.58, 0.26, 0.52, 16),
  ...linePoints(0.39, 0.58, 0.39, 0.4, 16),
  ...linePoints(0.52, 0.58, 0.52, 0.3, 16),
  ...linePoints(0.65, 0.58, 0.65, 0.46, 16),
];

// Principles: a checklist mark - three ticks beside three lines.
const principlesShape: Point[] = [0.32, 0.48, 0.64].flatMap((y) => [
  ...linePoints(0.24, y, 0.28, y + 0.04, 6),
  ...linePoints(0.28, y + 0.04, 0.36, y - 0.05, 10),
  ...linePoints(0.44, y, 0.78, y, 22),
]);

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

// Projects: a server rack - three stacked units, each with status lights
// and a vent line. Reads as "systems that run", distinct from the
// architecture globe and the case-study document.
const projectsShape: Point[] = [0.2, 0.42, 0.64].flatMap((y) => [
  ...rectOutlinePoints(0.26, y, 0.48, 0.16, 18),
  ...circlePoints(0.33, y + 0.08, 0.016, 10),
  ...circlePoints(0.39, y + 0.08, 0.016, 10),
  ...linePoints(0.48, y + 0.08, 0.67, y + 0.08, 14),
]);

// Every shape is drawn freehand in its own unit box, so raw extents and
// centres differ wildly (the globe spans 88% of its box, the bar chart
// half of it, off-centre). Normalising re-centres each one on (0.5, 0.5)
// and scales it so its larger extent is SHAPE_SPAN - every section's mark
// then reads at the same visual size and sits in the middle of its column.
// 3D shapes spin about x = 0.5, so their width is the full radius in the
// xz-plane and their x centre stays put.
const SHAPE_SPAN = 0.62;

function normalize(points: Point[], span = SHAPE_SPAN): Point[] {
  const is3d = points.some((p) => p.z !== undefined);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let radius = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    radius = Math.max(radius, Math.hypot(p.x - 0.5, p.z ?? 0));
  }
  const cx = is3d ? 0.5 : (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = is3d ? radius * 2 : maxX - minX;
  const scale = span / Math.max(width, maxY - minY);
  return points.map((p) => ({
    x: 0.5 + (p.x - cx) * scale,
    y: 0.5 + (p.y - cy) * scale,
    ...(p.z !== undefined ? { z: p.z * scale } : {}),
  }));
}

export const sectionShapes: Record<string, Point[]> = {
  about: normalize(aboutShape),
  architecture: normalize(globeShape, 0.66),
  projects: normalize(projectsShape),
  work: normalize(caseStudiesShape),
  stack: normalize(stackShape),
  principles: normalize(principlesShape),
  // Long and thin: give it a little more width so it doesn't read as a dash.
  experience: normalize(experienceShape, 0.66),
  contact: normalize(contactShape),
};
