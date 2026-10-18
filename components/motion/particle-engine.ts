import * as THREE from "three";
import {
  getParticleTargets,
  getRevealProgress,
  getSectionFlaps,
  getRowRevealProgress,
  type ParticleTarget,
} from "@/lib/particle-store";
import type { SectionTheme } from "@/lib/theme-colors";
import type { DeviceTier } from "@/lib/device-tier";

// The three.js half of <ParticleSystem/>. Lives in its own module so the
// wrapper can import() it after the page is idle - three.js is ~150 KB
// gzipped and nothing above the fold needs it to be interactive.

// How far a section's dominance reaches, as a multiple of viewport height.
// Deliberately wide: the brief asks for the shape to stay held for longer,
// so a section counts as "in view" over a broad band rather than a narrow
// one centered on the middle of the screen.
const DOMINANCE_RANGE = 1.15;
// Within this fraction of DOMINANCE_RANGE from dead-center, a section scores
// a flat 1.0 - full shape, no decay - instead of starting to fade the
// instant the viewport drifts off its exact midpoint. This is what gives a
// converged shape a genuine hold: only once scrolling carries the section
// past this plateau does its score (and therefore the shape blend) start
// easing back down toward 0.
const DOMINANCE_HOLD_FRACTION = 0.5;
// A candidate only takes over from the current active target once it's
// ahead by this margin - stops two adjacent sections from flickering back
// and forth around their crossover point.
const HYSTERESIS_MARGIN = 0.12;
// How quickly rendered particle position eases toward its target each
// frame. Small = more lag = the "smooth, delayed" motion asked for.
const POSITION_DAMPING = 0.045;
// While a hand-off between two shapes is playing (see BURST_*), particles
// ease more slowly, so the swarm visibly drifts rather than snapping.
const BURST_POSITION_DAMPING = 0.028;
// Hand-off between sections: when the dominant section changes, the swarm
// first bursts outward (BURST_OUT_S), hangs spread out (BURST_HOLD_S), then
// slowly gathers into the new shape (BURST_IN_S). Time-based rather than
// scroll-based: dominance flips in a single frame, so without this the old
// shape morphed straight into the new one in about half a second.
const BURST_OUT_S = 0.55;
const BURST_HOLD_S = 0.35;
const BURST_IN_S = 2.1;
// How far each particle is thrown past its idle position at the peak of a
// burst, as a fraction of the larger viewport side (randomised per
// particle between the two).
const BURST_REACH_MIN = 0.12;
const BURST_REACH_MAX = 0.5;
// 3D shapes are viewed from slightly above (radians), applied after the
// spin so horizontal rings and plates read as ellipses and slabs instead of
// collapsing into flat lines when edge-on.
const VIEW_TILT = 0.46;
// Particle color now tracks the section's actual row-flap reveal progress
// (reported by <SectionReveal/> from the same GSAP scrub) rather than a
// fixed idle/converged theme switch, so this only needs to smooth out the
// per-frame numeric jitter, not carry the whole transition - a much lighter
// touch than before keeps color from visibly lagging the real background.
const COLOR_DAMPING = 0.22;
const MOUSE_RADIUS = 100;
const MOUSE_STRENGTH = 2;
const REPULSION_DECAY = 0.99;
const DEPTH_RANGE = 380;
// Shapes are drawn larger than the screen-space marker rect they converge
// into - the marker is just a layout anchor, not a clip bounds, so scaling
// the point cloud out from its own center (rather than the rect's edges)
// is free and reads as a bigger, bolder shape without moving its middle.
const SHAPE_SCALE = 1.5;
// Once converged, particles don't lock to their exact shape point - they
// keep a small independent wander around it (scaled to the shape's own
// size), so a held shape still reads as alive and has some fill/volume
// instead of every particle sitting frozen on a bare outline.
const SHAPE_WANDER_FRACTION = 0.06;
// Rotation speed (rad/s) for shapes that carry depth (Point.z).
const SHAPE_SPIN_SPEED = 0.35;

// Particle budget per tier and viewport. "low" keeps every shape readable
// (each shape has a few hundred points) at roughly a third of the CPU cost.
const PARTICLE_COUNT = {
  high: { desktop: 5000, mobile: 900 },
  low: { desktop: 1800, mobile: 600 },
} as const;
// Pixel-ratio cap. The points are soft round sprites, so the difference
// between 1.5x and 2x is invisible while the fill cost is ~44% lower.
const MAX_PIXEL_RATIO: Record<DeviceTier, number> = { high: 1.5, low: 1 };
// Budget for the Canvas 2D fallback (no WebGL), drawn on the CPU at 1x.
const FALLBACK_COUNT = { desktop: 900, mobile: 400 } as const;

// Runtime step-down: if the average frame over a sample window is slower
// than this (~42fps), halve the live particle count and drop to 1x pixel
// ratio, down to MIN_COUNT. Measured after a warm-up so first-load jank
// (fonts, hydration, the lazy 3D chunk) doesn't trigger it.
const SLOW_FRAME_MS = 24;
const SAMPLE_FRAMES = 90;
const WARMUP_MS = 2500;
const MIN_COUNT = { desktop: 600, mobile: 300 } as const;

// Element rects are cached as document offsets and only re-measured when
// layout may have changed (resize, body size change) or after this long as
// a safety net - so the per-frame loop does no forced layout reads at all.
const RECT_REFRESH_MS = 1000;

type ParticleData = {
  baseX: number;
  baseY: number;
  baseZ: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
  speed: number;
  driftAmp: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  repelX: number;
  repelY: number;
  size: number;
  // Unit direction and distance (fraction of the viewport's larger side)
  // this particle is thrown during a section hand-off burst.
  burstDirX: number;
  burstDirY: number;
  burstReach: number;
  // Eased per-particle color (0-1 channels), so each particle can track the
  // exact background band it's currently drawn over - a row mid-flap, a row
  // already revealed, or a row still fully covered - instead of every
  // particle on the canvas sharing one blended-average color.
  curR: number;
  curG: number;
  curB: number;
};

type ScreenRect = { top: number; left: number; width: number; height: number };

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float depthT = clamp((position.z + ${DEPTH_RANGE.toFixed(1)}) / ${(DEPTH_RANGE * 2).toFixed(1)}, 0.0, 1.0);
    gl_PointSize = aSize * mix(0.55, 1.7, depthT);
    vAlpha = mix(0.3, 1.0, depthT);
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, d) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Cached singletons, not allocated per-call - themeColor() is called from
// the per-particle hot path (up to 5000x/frame) as well as the once-per-
// frame fallback, so a `new THREE.Color(...)` here would mean thousands of
// throwaway allocations every frame. Callers only ever read from what this
// returns (.copy()/.r/.g/.b), never mutate it in place.
const DARK_PARTICLE_COLOR = new THREE.Color(1, 1, 1);
const LIGHT_PARTICLE_COLOR = new THREE.Color(0.05, 0.05, 0.05);

function themeColor(theme: SectionTheme): THREE.Color {
  // Particles are always the inverse of their section's background - white
  // dots read on the dark sections, dark dots read on the light ones.
  return theme === "dark" ? DARK_PARTICLE_COLOR : LIGHT_PARTICLE_COLOR;
}

// Whether this browser can create a WebGL context at all. Fails when the
// GPU is disabled or blocklisted and the software fallback is off - e.g.
// the Brave snap on Linux/Wayland, which runs with GPU compositing disabled,
// and current Chromium no longer falls back to SwiftShader automatically.
// The probe context is released straight away.
function webglAvailable(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

// What the simulation draws into. WebGL is the normal path; without it the
// same position/size/colour buffers are drawn with Canvas 2D - fewer
// particles, the same shapes, colours and motion - instead of nothing.
type Surface = {
  element: HTMLCanvasElement;
  setSize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
  render(count: number): void;
  setLoop(step: ((now: number) => void) | null): void;
  dispose(): void;
};

// Soft round sprite matching the shader's smoothstep falloff, pre-rendered
// once per colour so each particle is a single drawImage.
function makeSprite(rgb: string): HTMLCanvasElement {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.1, `rgba(${rgb},1)`);
  grad.addColorStop(0.55, `rgba(${rgb},0.5)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function create2dSurface(
  positions: Float32Array,
  sizes: Float32Array,
  colors: Float32Array,
): Surface | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const light = makeSprite("255,255,255");
  const dark = makeSprite("13,13,13");
  let w = 0;
  let h = 0;
  let ratio = 1;
  let raf = 0;
  function apply() {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  return {
    element: canvas,
    setSize(width, height) {
      w = width;
      h = height;
      apply();
    },
    setPixelRatio(r) {
      ratio = r;
      if (w) apply();
    },
    render(count) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        const z = positions[i * 3 + 2];
        // Same depth cues as the vertex shader.
        const depthT = Math.min(Math.max((z + DEPTH_RANGE) / (DEPTH_RANGE * 2), 0), 1);
        const size = sizes[i] * (0.55 + 1.15 * depthT);
        // Particles only ever blend between the two theme colours, so the
        // nearer one is close enough and keeps this to one draw each.
        ctx.globalAlpha = 0.3 + 0.7 * depthT;
        ctx.drawImage(
          colors[i * 3] > 0.5 ? light : dark,
          positions[i * 3] - size / 2,
          positions[i * 3 + 1] - size / 2,
          size,
          size,
        );
      }
      ctx.globalAlpha = 1;
    },
    setLoop(step) {
      cancelAnimationFrame(raf);
      if (!step) return;
      const tick = (now: number) => {
        step(now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    dispose() {
      cancelAnimationFrame(raf);
    },
  };
}

// Mounts the particle canvas into `mount` and starts it. Returns a cleanup
// that stops the loop and releases every GL resource.
export function startParticles(
  mount: HTMLElement,
  { reducedMotion, tier }: { reducedMotion: boolean; tier: DeviceTier },
): () => void {
  let width = window.innerWidth;
  let height = window.innerHeight;
  const viewport = width < 768 ? "mobile" : "desktop";

  const useWebGL = webglAvailable();

  const scene = new THREE.Scene();
  // Ortho camera mapped 1:1 to CSS pixels, top=0/bottom=height so world Y
  // matches screen Y directly - the same numbers getBoundingClientRect()
  // returns for each section's target rect can be used as world
  // coordinates with zero conversion.
  const camera = new THREE.OrthographicCamera(0, width, 0, height, -2000, 2000);
  camera.position.set(0, 0, 1000);

  const count: number = useWebGL ? PARTICLE_COUNT[tier][viewport] : FALLBACK_COUNT[viewport];
  const minCount = Math.min(MIN_COUNT[viewport], count);
  // How many particles are simulated and drawn right now - starts at the
  // full budget, can only step down (see SLOW_FRAME_MS).
  let activeCount: number = count;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const particles: ParticleData[] = [];

  function randomIdle(): ParticleData {
    return {
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      baseZ: (Math.random() * 2 - 1) * DEPTH_RANGE,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseZ: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.25,
      driftAmp: 40 + Math.random() * 50,
      currentX: 0,
      currentY: 0,
      currentZ: 0,
      repelX: 0,
      repelY: 0,
      size: 5 + Math.random() * 7,
      ...(() => {
        const a = Math.random() * Math.PI * 2;
        return {
          burstDirX: Math.cos(a),
          burstDirY: Math.sin(a),
          burstReach: BURST_REACH_MIN + Math.random() * (BURST_REACH_MAX - BURST_REACH_MIN),
        };
      })(),
      curR: 1,
      curG: 1,
      curB: 1,
    };
  }

  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const particle = randomIdle();
    particle.currentX = particle.baseX;
    particle.currentY = particle.baseY;
    particle.currentZ = particle.baseZ;
    particles.push(particle);
    sizes[i] = 2 + Math.random() * 3;
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let surface: Surface | null = null;
  if (useWebGL) {
    try {
      // No antialias: every point is already drawn as a smoothstepped disc
      // in the fragment shader, so MSAA only multiplied the fill cost.
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      surface = {
        element: renderer.domElement,
        setSize: (w, h) => renderer.setSize(w, h),
        setPixelRatio: (r) => renderer.setPixelRatio(r),
        render: () => renderer.render(scene, camera),
        setLoop: (step) => renderer.setAnimationLoop(step),
        dispose: () => renderer.dispose(),
      };
    } catch {
      // Probe passed but the real context failed (lost GPU, driver
      // quirk) - fall through to 2D.
    }
  }
  surface ??= create2dSurface(positions, sizes, colors);
  if (!surface) {
    geometry.dispose();
    material.dispose();
    return () => {};
  }
  const view: Surface = surface;
  view.setPixelRatio(
    useWebGL ? Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO[tier]) : 1,
  );
  view.setSize(width, height);
  mount.appendChild(view.element);

  const mouse = { x: width / 2, y: height / 2, active: false };
  const tilt = { x: 0, y: 0 };

  function onPointerMove(e: PointerEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }
  function onPointerLeave() {
    mouse.active = false;
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });

  // Document-space rect cache. Reading getBoundingClientRect() ~15 times a
  // frame forced a synchronous layout whenever GSAP/Motion had written
  // styles earlier in the same frame; instead each element is measured
  // once, stored relative to the document, and shifted by scrollY per
  // frame. Invalidated on resize/body size change and every RECT_REFRESH_MS.
  //
  // Sticky elements (the section shape markers on md+) move relative to the
  // document as you scroll, so for those the cache keeps their containing
  // block's document rect and their sticky offset instead, and the per-frame
  // position is computed the way the browser does it: pinned at `top`, but
  // never above its natural spot or past its container's bottom.
  type CachedRect = ScreenRect & {
    sticky?: { offset: number; parentTop: number; parentHeight: number };
  };
  const rectCache = new Map<HTMLElement, CachedRect>();
  let rectsMeasuredAt = 0;

  function invalidateRects() {
    rectCache.clear();
  }

  function measure(el: HTMLElement, scrollY: number): CachedRect {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const parent = el.parentElement;
    if (style.position === "sticky" && parent) {
      const pr = parent.getBoundingClientRect();
      return {
        top: 0,
        left: r.left,
        width: r.width,
        height: r.height,
        sticky: {
          offset: parseFloat(style.top) || 0,
          parentTop: pr.top + scrollY,
          parentHeight: pr.height,
        },
      };
    }
    return { top: r.top + scrollY, left: r.left, width: r.width, height: r.height };
  }

  function rectOf(el: HTMLElement, scrollY: number): ScreenRect {
    let doc = rectCache.get(el);
    if (!doc) {
      doc = measure(el, scrollY);
      rectCache.set(el, doc);
    }
    let top = doc.top - scrollY;
    if (doc.sticky) {
      // Natural position: top of its container (the markers are self-start).
      const natural = doc.sticky.parentTop - scrollY;
      const maxTop = natural + doc.sticky.parentHeight - doc.height;
      top = Math.min(Math.max(natural, doc.sticky.offset), maxTop);
    }
    return { top, left: doc.left, width: doc.width, height: doc.height };
  }

  const bodyObserver = new ResizeObserver(invalidateRects);
  bodyObserver.observe(document.body);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    view.setSize(width, height);
    camera.right = width;
    camera.bottom = height;
    camera.updateProjectionMatrix();
    invalidateRects();
  }
  window.addEventListener("resize", resize);

  // Which registered target currently "wins", with hysteresis so it
  // doesn't flip-flop at the boundary between two sections.
  let activeTarget: ParticleTarget | null = null;
  let activeScore = 0;

  // Hand-off burst progress, in seconds since it (re)started; null = none.
  // Restarting mid-burst resumes from the current spread, so scrolling
  // through several sections keeps the swarm scattered until you stop.
  let burstT: number | null = null;
  let lastTargetId: string | null = null;
  function burstStrength(): number {
    if (burstT === null) return 0;
    if (burstT < BURST_OUT_S) return easeOutCubic(burstT / BURST_OUT_S);
    const t = burstT - BURST_OUT_S - BURST_HOLD_S;
    if (t < 0) return 1;
    if (t < BURST_IN_S) return 1 - easeInOutCubic(t / BURST_IN_S);
    return 0;
  }
  function startBurst() {
    const s = burstStrength();
    // Re-enter the "out" phase at the time that yields the current spread.
    burstT = s >= 1 ? BURST_OUT_S : BURST_OUT_S * (1 - Math.cbrt(1 - s));
  }

  // Distance-to-score curve with a flat plateau near the center: full
  // marks (1.0) inside the hold zone, then a linear fade out to the edge
  // of DOMINANCE_RANGE. Without the plateau, a converged shape started
  // decaying the instant scrolling nudged the section off dead-center,
  // which read as barely holding at all.
  function dominanceScore(rect: ScreenRect): number {
    const centerY = rect.top + rect.height / 2;
    const dist = Math.abs(centerY - height / 2);
    const maxDist = height * DOMINANCE_RANGE;
    const holdDist = maxDist * DOMINANCE_HOLD_FRACTION;
    if (dist <= holdDist) return 1;
    return Math.min(Math.max(1 - (dist - holdDist) / (maxDist - holdDist), 0), 1);
  }

  function pickActiveTarget(
    targets: ParticleTarget[],
    scrollY: number,
  ): { target: ParticleTarget | null; blend: number } {
    let best: ParticleTarget | null = null;
    let bestScore = 0;
    for (const t of targets) {
      const score = dominanceScore(rectOf(t.el, scrollY));
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    if (
      activeTarget &&
      best &&
      best.id !== activeTarget.id &&
      bestScore < activeScore + HYSTERESIS_MARGIN
    ) {
      // Not enough to displace the current one - re-score the current
      // target directly so it keeps winning until the margin clears.
      activeScore = dominanceScore(rectOf(activeTarget.el, scrollY));
      return { target: activeTarget, blend: activeScore };
    }
    activeTarget = best;
    activeScore = bestScore;
    return { target: best, blend: bestScore };
  }

  const fallbackColor = new THREE.Color(1, 1, 1);
  const fromColorTmp = new THREE.Color(1, 1, 1);
  const toColorTmp = new THREE.Color(1, 1, 1);

  // Live per-frame band list: one entry per registered <SectionReveal/>,
  // giving the exact screen-space Y range its flap rows cover right now
  // plus that section's own live per-row reveal progress. Rebuilt every
  // frame from the rect cache so it always reflects live scroll position -
  // this is what lets color be looked up per-particle by "what's actually
  // behind this dot" instead of by whichever section currently wins
  // shape-dominance elsewhere in this same frame.
  type FlapBand = {
    top: number;
    height: number;
    rows: number;
    theme: SectionTheme;
    prevTheme: SectionTheme;
    rowProgress: number[] | null;
  };
  let flapBands: FlapBand[] = [];

  function rebuildFlapBands(scrollY: number) {
    flapBands = getSectionFlaps().map((f) => {
      const rect = rectOf(f.el, scrollY);
      return {
        top: rect.top,
        height: rect.height,
        rows: f.rows,
        theme: f.theme,
        prevTheme: f.prevTheme,
        rowProgress: getRowRevealProgress(f.id),
      };
    });
  }

  // Writes the background color behind screen position y into `out` (r/g/b
  // 0-1). Inside a section's flap band it's that section's own live per-row
  // progress, not a canvas-wide average. Outside every band (the hero and
  // edge-text block above the first section, the footer below the last) it
  // is the theme of the nearest band above, or the first band's prevTheme
  // when y is above them all - the page's palettes only change at bands.
  // Returns false only when no band is registered (mobile before mount).
  function backgroundColorAt(y: number, out: { r: number; g: number; b: number }): boolean {
    let above: FlapBand | null = null;
    for (const band of flapBands) {
      if (y > band.top + band.height) {
        if (!above || band.top > above.top) above = band;
        continue;
      }
      if (y < band.top) continue;
      const rowIdx =
        band.rows > 0
          ? Math.min(band.rows - 1, Math.max(0, Math.floor(((y - band.top) / band.height) * band.rows)))
          : 0;
      const p = band.rowProgress ? (band.rowProgress[rowIdx] ?? 1) : 1;
      const from = themeColor(band.prevTheme);
      const to = themeColor(band.theme);
      out.r = from.r + (to.r - from.r) * p;
      out.g = from.g + (to.g - from.g) * p;
      out.b = from.b + (to.b - from.b) * p;
      return true;
    }
    if (flapBands.length === 0) return false;
    const c = above
      ? themeColor(above.theme)
      : themeColor(flapBands.reduce((a, b) => (b.top < a.top ? b : a)).prevTheme);
    out.r = c.r;
    out.g = c.g;
    out.b = c.b;
    return true;
  }

  // The row flaps sit above the section content (z-10) so they can hide it,
  // and this canvas sits below the content (z-5) so particles never cover
  // text - which put every flap on top of the particles, and the swarm
  // vanished behind whichever rows were still covering the screen. While
  // any on-screen flap row is not fully open, the canvas is lifted above
  // the flaps; once they've all opened it drops back under the content.
  const BASE_Z = mount.style.zIndex;
  const RAISED_Z = "11";
  let raised = false;
  function updateLayer() {
    let covering = false;
    for (const band of flapBands) {
      if (band.top > height || band.top + band.height < 0 || !band.rowProgress) continue;
      const rowH = band.height / Math.max(1, band.rows);
      for (let r = 0; r < band.rowProgress.length; r++) {
        const rowTop = band.top + r * rowH;
        if (rowTop > height || rowTop + rowH < 0) continue;
        if (band.rowProgress[r] < 0.999) {
          covering = true;
          break;
        }
      }
      if (covering) break;
    }
    if (covering !== raised) {
      raised = covering;
      mount.style.zIndex = covering ? RAISED_Z : BASE_Z;
    }
  }

  const bandColorTmp = { r: 1, g: 1, b: 1 };

  const clock = new THREE.Clock();
  let lastStepAt = 0;

  const startedAt = performance.now();
  let lastFrameAt = 0;
  let frameTimeSum = 0;
  let frameSamples = 0;

  // Halves the live particle budget when frames are consistently slow.
  // Particles past activeCount are neither simulated nor drawn.
  function trackFrameTime(now: number) {
    const dt = lastFrameAt ? now - lastFrameAt : 0;
    lastFrameAt = now;
    // Ignore the warm-up and any gap long enough to be a tab switch.
    if (now - startedAt < WARMUP_MS || dt === 0 || dt > 250) return;
    frameTimeSum += dt;
    frameSamples++;
    if (frameSamples < SAMPLE_FRAMES) return;
    const avg = frameTimeSum / frameSamples;
    frameTimeSum = 0;
    frameSamples = 0;
    if (avg > SLOW_FRAME_MS && activeCount > minCount) {
      activeCount = Math.max(minCount, Math.floor(activeCount / 2));
      geometry.setDrawRange(0, activeCount);
      view.setPixelRatio(1);
    }
  }

  function step(now: number) {
    trackFrameTime(now);

    const t = clock.getElapsedTime();
    const scrollY = window.scrollY;
    if (now - rectsMeasuredAt > RECT_REFRESH_MS) {
      invalidateRects();
      rectsMeasuredAt = now;
    }

    const dt = lastStepAt ? Math.min((now - lastStepAt) / 1000, 0.1) : 0;
    lastStepAt = now;
    const orderedTargets = getParticleTargets();
    const { target, blend } = pickActiveTarget(orderedTargets, scrollY);
    // A burst plays only when one shape hands over to another - not on the
    // first convergence out of the hero's idle scatter.
    const targetId = target?.shapePoints ? target.id : null;
    if (targetId !== lastTargetId) {
      if (targetId && lastTargetId) startBurst();
      lastTargetId = targetId;
    }
    if (burstT !== null) {
      burstT += dt;
      if (burstT > BURST_OUT_S + BURST_HOLD_S + BURST_IN_S) burstT = null;
    }
    const burst = burstStrength();
    const burstReachPx = Math.max(width, height) * burst;
    const damping = burstT !== null ? BURST_POSITION_DAMPING : POSITION_DAMPING;
    const shapePoints = target?.shapePoints ?? null;
    const shapeRect = shapePoints ? rectOf(target!.el, scrollY) : null;
    const effectiveBlend = shapePoints ? blend : 0;

    rebuildFlapBands(scrollY);
    updateLayer();

    // Fallback color for any particle not currently over a registered
    // flap band at all (e.g. still scattered in the Hero, which never
    // has a cover to track) - the previous canvas-wide blend, kept only
    // as a backstop rather than the primary path.
    if (target) {
      const idx = orderedTargets.findIndex((tt) => tt.id === target.id);
      const prevTheme = idx > 0 ? orderedTargets[idx - 1].theme : target.theme;
      const revealProgress = getRevealProgress(target.id);
      fromColorTmp.copy(themeColor(prevTheme));
      toColorTmp.copy(themeColor(target.theme));
      fallbackColor.copy(fromColorTmp).lerp(toColorTmp, revealProgress);
    } else {
      fallbackColor.copy(themeColor("dark"));
    }

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.aColor as THREE.BufferAttribute;

    const spinCos = Math.cos(t * SHAPE_SPIN_SPEED);
    const spinSin = Math.sin(t * SHAPE_SPIN_SPEED);
    const tiltCos = Math.cos(VIEW_TILT);
    const tiltSin = Math.sin(VIEW_TILT);

    // Per-frame constants of the shape mapping, hoisted out of the loop.
    let shapeCenterX = 0;
    let shapeCenterY = 0;
    let shapeSide = 0;
    if (shapeRect) {
      // Scaled out from the marker rect's own center (not its edges) so
      // the shape grows bigger without shifting where it's centered.
      // Mapped into a square (the rect's shorter side), never stretched
      // to the rect itself - the marker column's height follows its
      // section's content, and a non-uniform map turned circles into
      // ovals whenever that content grew.
      shapeCenterX = shapeRect.left + shapeRect.width / 2;
      shapeCenterY = shapeRect.top + shapeRect.height / 2;
      shapeSide = Math.min(shapeRect.width, shapeRect.height) * SHAPE_SCALE;
    }

    for (let i = 0; i < activeCount; i++) {
      const p = particles[i];

      const idleX = p.baseX + Math.sin(t * p.speed + p.phaseX) * p.driftAmp;
      const idleY = p.baseY + Math.cos(t * p.speed + p.phaseY) * p.driftAmp;
      const idleZ = p.baseZ + Math.sin(t * p.speed * 0.6 + p.phaseZ) * (p.driftAmp * 0.5);
      // At a burst's peak, particles are thrown past their idle spot along
      // their own direction - the swarm fills (and spills off) the screen
      // before regrouping, rather than just loosening around the old shape.
      const scatterX = idleX + p.burstDirX * p.burstReach * burstReachPx;
      const scatterY = idleY + p.burstDirY * p.burstReach * burstReachPx;

      let desiredX = idleX;
      let desiredY = idleY;
      let desiredZ = idleZ;

      if (shapePoints && shapeRect && shapePoints.length > 0) {
        // Spread the live particles evenly across the shape's points, so a
        // reduced particle budget still covers the whole outline instead
        // of only its first N points.
        const sp = shapePoints[Math.floor((i * shapePoints.length) / activeCount)];
        // Points with a z are true 3D shapes (e.g. the architecture
        // globe): spin them about the vertical axis and use the rotated
        // depth, so front-facing particles render larger/brighter.
        let spX = sp.x - 0.5;
        let spY = sp.y - 0.5;
        let spDepth = 0;
        if (sp.z !== undefined) {
          spX = (sp.x - 0.5) * spinCos - sp.z * spinSin;
          const spun = (sp.x - 0.5) * spinSin + sp.z * spinCos;
          // Then tilt toward the viewer: the near side drops, the top
          // leans in.
          spY = (sp.y - 0.5) * tiltCos + spun * tiltSin;
          spDepth = spun * tiltCos - (sp.y - 0.5) * tiltSin;
        }
        const shapeX = shapeCenterX + spX * shapeSide;
        const shapeY = shapeCenterY + spY * shapeSide;
        // Small independent wander around the assigned shape point so a
        // held shape keeps some interior motion/fill instead of every
        // particle freezing on the bare outline. Reuses each particle's
        // own idle phase/speed (offset so it doesn't sync with the idle
        // drift) rather than adding new per-particle random state.
        const wanderRadius =
          (shapeSide / SHAPE_SCALE) * SHAPE_WANDER_FRACTION *
          (sp.z !== undefined ? 0.35 : 1);
        const wanderX = Math.sin(t * p.speed * 1.3 + p.phaseX * 1.7) * wanderRadius;
        const wanderY = Math.cos(t * p.speed * 1.1 + p.phaseY * 1.9) * wanderRadius;
        const shapeZ =
          sp.z !== undefined ? spDepth * DEPTH_RANGE * 2.2 : ((i % 7) - 3) * 26;
        desiredX = idleX + (shapeX + wanderX - idleX) * effectiveBlend;
        desiredY = idleY + (shapeY + wanderY - idleY) * effectiveBlend;
        desiredZ = idleZ + (shapeZ - idleZ) * effectiveBlend;
      }

      if (burst > 0) {
        desiredX += (scatterX - desiredX) * burst;
        desiredY += (scatterY - desiredY) * burst;
        desiredZ += (idleZ - desiredZ) * burst;
      }

      p.currentX += (desiredX - p.currentX) * damping;
      p.currentY += (desiredY - p.currentY) * damping;
      p.currentZ += (desiredZ - p.currentZ) * damping;

      p.repelX *= REPULSION_DECAY;
      p.repelY *= REPULSION_DECAY;
      if (mouse.active) {
        const dx = p.currentX + p.repelX - mouse.x;
        const dy = p.currentY + p.repelY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < MOUSE_RADIUS) {
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * MOUSE_STRENGTH;
          p.repelX += (dx / dist) * force;
          p.repelY += (dy / dist) * force;
        }
      }

      const finalY = p.currentY + p.repelY;
      posAttr.setXYZ(i, p.currentX + p.repelX, finalY, p.currentZ);

      // Color the particle by what's actually behind it right now - its
      // own screen Y against the live flap bands - rather than by
      // whichever section is winning shape-dominance this frame. Falls
      // back to the single blended color only when this particle isn't
      // over any registered section at all.
      const hasBand = backgroundColorAt(finalY, bandColorTmp);
      const targetR = hasBand ? bandColorTmp.r : fallbackColor.r;
      const targetG = hasBand ? bandColorTmp.g : fallbackColor.g;
      const targetB = hasBand ? bandColorTmp.b : fallbackColor.b;
      p.curR += (targetR - p.curR) * COLOR_DAMPING;
      p.curG += (targetG - p.curG) * COLOR_DAMPING;
      p.curB += (targetB - p.curB) * COLOR_DAMPING;
      colorAttr.setXYZ(i, p.curR, p.curG, p.curB);
    }
    // Upload only the live slice of each buffer.
    posAttr.clearUpdateRanges();
    posAttr.addUpdateRange(0, activeCount * 3);
    posAttr.needsUpdate = true;
    colorAttr.clearUpdateRanges();
    colorAttr.addUpdateRange(0, activeCount * 3);
    colorAttr.needsUpdate = true;

    // Subtle whole-field tilt toward the mouse for a cheap sense of depth
    // without breaking the pixel-exact target mapping above.
    const targetTiltX = mouse.active ? ((mouse.y / height) - 0.5) * 0.08 : 0;
    const targetTiltY = mouse.active ? ((mouse.x / width) - 0.5) * -0.08 : 0;
    tilt.x += (targetTiltX - tilt.x) * 0.04;
    tilt.y += (targetTiltY - tilt.y) * 0.04;
    points.rotation.x = tilt.x;
    points.rotation.y = tilt.y;

    view.render(activeCount);
  }

  if (reducedMotion) {
    // One static frame, all particles fully scattered - no loop, no
    // listeners driving continued motion.
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      posAttr.setXYZ(i, p.baseX, p.baseY, p.baseZ);
    }
    posAttr.needsUpdate = true;
    view.render(activeCount);
  } else {
    view.setLoop(step);
  }

  return () => {
    view.setLoop(null);
    mount.style.zIndex = BASE_Z;
    bodyObserver.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerleave", onPointerLeave);
    geometry.dispose();
    material.dispose();
    view.dispose();
    mount.removeChild(view.element);
  };
}
