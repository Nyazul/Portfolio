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

// Case studies ("bugs worth writing about"): a magnifying glass with a bug
// caught in the lens. Lens rim drawn as two close rings so it reads as
// solid, a thick handle, and a small beetle - body, head, six legs and two
// antennae - centred inside the glass.
const LENS = { cx: 0.42, cy: 0.42, r: 0.24 };
const BUG = { cx: LENS.cx, cy: LENS.cy + 0.015 };
const bugLegs = [-1, 1].flatMap((side) =>
  [-0.05, 0, 0.05].flatMap((dy, i) => {
    const x0 = BUG.cx + side * 0.04;
    const y0 = BUG.cy + dy;
    const kneeX = x0 + side * 0.04;
    const kneeY = y0 + (i - 1) * 0.02 - 0.012;
    return [
      ...linePoints(x0, y0, kneeX, kneeY, 6),
      ...linePoints(kneeX, kneeY, kneeX + side * 0.025, kneeY + (i - 1) * 0.03 + 0.02, 5),
    ];
  }),
);
const caseStudiesShape: Point[] = [
  ...circlePoints(LENS.cx, LENS.cy, LENS.r, 130),
  ...circlePoints(LENS.cx, LENS.cy, LENS.r - 0.022, 120),
  // Handle: three parallel strokes from the rim out to the bottom right.
  ...[-0.018, 0, 0.018].flatMap((o) => {
    const a = Math.PI / 4;
    const sx = LENS.cx + Math.cos(a) * LENS.r - Math.sin(a) * o;
    const sy = LENS.cy + Math.sin(a) * LENS.r + Math.cos(a) * o;
    return linePoints(sx, sy, sx + 0.2, sy + 0.2, 26);
  }),
  // Bug: oval body with a seam down the back, head, antennae, legs.
  ...Array.from({ length: 46 }, (_, i) => {
    const a = (i / 46) * Math.PI * 2;
    return { x: BUG.cx + Math.cos(a) * 0.042, y: BUG.cy + 0.01 + Math.sin(a) * 0.065 };
  }),
  ...linePoints(BUG.cx, BUG.cy - 0.045, BUG.cx, BUG.cy + 0.07, 10),
  ...circlePoints(BUG.cx, BUG.cy - 0.075, 0.022, 18),
  ...linePoints(BUG.cx - 0.01, BUG.cy - 0.095, BUG.cx - 0.04, BUG.cy - 0.135, 6),
  ...linePoints(BUG.cx + 0.01, BUG.cy - 0.095, BUG.cx + 0.04, BUG.cy - 0.135, 6),
  ...bugLegs,
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

// Experience (3D): a rising double helix - two strands climbing 2.5 turns,
// joined by rungs, with milestone clusters along the front strand. Reads as
// a career that builds on itself, and spins like the globe.
const HELIX = { r: 0.17, turns: 2.5, top: 0.12, bottom: 0.88 };
function helixPoint(t: number, phase: number): Point {
  const a = t * HELIX.turns * Math.PI * 2 + phase;
  return {
    x: 0.5 + Math.cos(a) * HELIX.r,
    y: HELIX.bottom - t * (HELIX.bottom - HELIX.top),
    z: Math.sin(a) * HELIX.r,
  };
}
const helixStrands = [0, Math.PI].flatMap((phase) =>
  Array.from({ length: 200 }, (_, i) => helixPoint(i / 199, phase)),
);
const helixRungs = Array.from({ length: 14 }, (_, k) => (k + 0.5) / 14).flatMap((t) => {
  const p = helixPoint(t, 0);
  const q = helixPoint(t, Math.PI);
  return Array.from({ length: 9 }, (_, i) => {
    const u = (i + 1) / 10;
    return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u, z: p.z! + (q.z! - p.z!) * u };
  });
});
const helixMilestones = [0.08, 0.36, 0.64, 0.92].flatMap((t) => {
  const c = helixPoint(t, 0);
  return Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    const rr = 0.014 + (i % 3) * 0.009;
    return { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr, z: c.z! + Math.sin(a * 2) * rr };
  });
});
const experienceShape: Point[] = [...helixStrands, ...helixRungs, ...helixMilestones];

// Contact: a simple envelope mark.
const contactShape: Point[] = [
  ...rectOutlinePoints(0.28, 0.36, 0.44, 0.3, 20),
  ...linePoints(0.28, 0.36, 0.5, 0.54, 22),
  ...linePoints(0.72, 0.36, 0.5, 0.54, 22),
];

// Projects (3D): a stack of three platform layers - square plates seen
// from slightly above (the engine tilts 3D shapes toward the viewer), each
// carrying a few service nodes, wired to the layer below by vertical data
// links. "Systems I've built": layered, connected, running. Spins like the
// globe, so the plates read as solid planes rather than flat outlines.
const LAYER_HALF = 0.24;
const LAYER_YS = [0.26, 0.5, 0.74];
function plateEdge(y: number, perSide: number): Point[] {
  const h = LAYER_HALF;
  const corners: [number, number][] = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  return corners.flatMap(([x1, z1], i) => {
    const [x2, z2] = corners[(i + 1) % 4];
    return Array.from({ length: perSide }, (_, k) => {
      const t = k / perSide;
      return { x: 0.5 + x1 + (x2 - x1) * t, y, z: z1 + (z2 - z1) * t };
    });
  });
}
// Service nodes per layer, as (x, z) offsets from the plate centre.
const layerNodes: [number, number][][] = [
  [
    [-0.12, -0.1],
    [0.12, 0.1],
  ],
  [
    [-0.14, 0.08],
    [0, -0.12],
    [0.14, 0.06],
  ],
  [
    [-0.1, -0.04],
    [0.08, 0.12],
    [0.13, -0.11],
  ],
];
function nodeRing(x: number, y: number, z: number, count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: 0.5 + x + Math.cos(a) * 0.026, y, z: z + Math.sin(a) * 0.026 };
  });
}
const projectsShape: Point[] = [
  ...LAYER_YS.flatMap((y) => [
    ...plateEdge(y, 34),
    // Inner frame, so each plate reads as a slab with a lip.
    ...plateEdge(y, 22).map((p) => ({ x: 0.5 + (p.x - 0.5) * 0.82, y: p.y, z: p.z! * 0.82 })),
  ]),
  ...layerNodes.flatMap((nodes, li) =>
    nodes.flatMap(([x, z]) => [...nodeRing(x, LAYER_YS[li], z, 18), { x: 0.5 + x, y: LAYER_YS[li], z }]),
  ),
  // Data links: each node on a layer drops to a node on the layer below.
  ...[
    [0, 0, 1, 0],
    [0, 1, 1, 2],
    [1, 1, 2, 2],
    [1, 0, 2, 0],
    [1, 2, 2, 1],
  ].flatMap(([la, na, lb, nb]) => {
    const [x1, z1] = layerNodes[la][na];
    const [x2, z2] = layerNodes[lb][nb];
    return Array.from({ length: 16 }, (_, i) => {
      const t = (i + 1) / 17;
      return {
        x: 0.5 + x1 + (x2 - x1) * t,
        y: LAYER_YS[la] + (LAYER_YS[lb] - LAYER_YS[la]) * t,
        z: z1 + (z2 - z1) * t,
      };
    });
  }),
];

// Every shape is drawn freehand in its own unit box, so raw extents and
// centres differ wildly (the globe spans 88% of its box, the bar chart
// half of it, off-centre). Normalising re-centres each one on (0.5, 0.5)
// and scales it so its larger extent is SHAPE_SPAN - every section's mark
// then reads at the same visual size and sits in the middle of its column.
// 3D shapes spin about x = 0.5 and are tilted toward the viewer, so their
// on-screen extent changes as they turn: they're scaled by their bounding
// sphere instead, which fits at every angle, and their x centre stays put.
const SHAPE_SPAN = 0.62;

function normalize(points: Point[], span = SHAPE_SPAN): Point[] {
  const is3d = points.some((p) => p.z !== undefined);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = is3d ? 0.5 : (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let extent = Math.max(maxX - minX, maxY - minY);
  if (is3d) {
    let radius = 0;
    for (const p of points) {
      radius = Math.max(radius, Math.hypot(p.x - 0.5, p.y - cy, p.z ?? 0));
    }
    extent = radius * 2;
  }
  const scale = span / extent;
  return points.map((p) => ({
    x: 0.5 + (p.x - cx) * scale,
    y: 0.5 + (p.y - cy) * scale,
    ...(p.z !== undefined ? { z: p.z * scale } : {}),
  }));
}

export const sectionShapes: Record<string, Point[]> = {
  about: normalize(aboutShape),
  architecture: normalize(globeShape, 0.66),
  projects: normalize(projectsShape, 0.72),
  work: normalize(caseStudiesShape),
  stack: normalize(stackShape),
  principles: normalize(principlesShape),
  // Tall and narrow: its bounding sphere is mostly empty to the sides.
  experience: normalize(experienceShape, 0.8),
  contact: normalize(contactShape),
};
