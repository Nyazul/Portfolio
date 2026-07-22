"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  getParticleTargets,
  getRevealProgress,
  getSectionFlaps,
  getRowRevealProgress,
  type ParticleTarget,
} from "@/lib/particle-store";
import type { SectionTheme } from "@/lib/theme-colors";

// Same kill switch as the rest of the particle system (PRD Section 12) - one
// env var disables the whole thing, no code rollback needed.
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_PARTICLES === "true";

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
  // Eased per-particle color (0-1 channels), so each particle can track the
  // exact background band it's currently drawn over - a row mid-flap, a row
  // already revealed, or a row still fully covered - instead of every
  // particle on the canvas sharing one blended-average color.
  curR: number;
  curG: number;
  curB: number;
};

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

// Cached singletons, not allocated per-call - themeColor() is now called
// from the per-particle hot path (up to 5000x/frame) as well as the
// once-per-frame fallback, so a `new THREE.Color(...)` here would mean
// thousands of throwaway allocations every frame. Callers only ever read
// from what this returns (.copy()/.r/.g/.b), never mutate it in place.
const DARK_PARTICLE_COLOR = new THREE.Color(1, 1, 1);
const LIGHT_PARTICLE_COLOR = new THREE.Color(0.05, 0.05, 0.05);

function themeColor(theme: SectionTheme): THREE.Color {
  // Particles are always the inverse of their section's background - white
  // dots read on the dark sections, dark dots read on the light ones.
  return theme === "dark" ? DARK_PARTICLE_COLOR : LIGHT_PARTICLE_COLOR;
}

export function ParticleSystem() {
  const mountRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!ENABLED) return;
    const mount = mountRef.current;
    if (!mount) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Ortho camera mapped 1:1 to CSS pixels, top=0/bottom=height so world Y
    // matches screen Y directly - the same numbers getBoundingClientRect()
    // returns for each section's target rect can be used as world
    // coordinates with zero conversion.
    const camera = new THREE.OrthographicCamera(0, width, 0, height, -2000, 2000);
    camera.position.set(0, 0, 1000);

    const count = window.innerWidth < 768 ? 900 : 5000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const particles: ParticleData[] = [];

    function randomIdle(p: Partial<ParticleData> = {}): ParticleData {
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
        curR: 1,
        curG: 1,
        curB: 1,
        ...p,
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

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      camera.right = width;
      camera.bottom = height;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);

    // Which registered target currently "wins", with hysteresis so it
    // doesn't flip-flop at the boundary between two sections.
    let activeTarget: ParticleTarget | null = null;
    let activeScore = 0;

    // Distance-to-score curve with a flat plateau near the center: full
    // marks (1.0) inside the hold zone, then a linear fade out to the edge
    // of DOMINANCE_RANGE. Without the plateau, a converged shape started
    // decaying the instant scrolling nudged the section off dead-center,
    // which read as barely holding at all.
    function dominanceScore(rect: DOMRect): number {
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(centerY - height / 2);
      const maxDist = height * DOMINANCE_RANGE;
      const holdDist = maxDist * DOMINANCE_HOLD_FRACTION;
      if (dist <= holdDist) return 1;
      return Math.min(Math.max(1 - (dist - holdDist) / (maxDist - holdDist), 0), 1);
    }

    function pickActiveTarget(): { target: ParticleTarget | null; blend: number } {
      const targets = getParticleTargets();
      let best: ParticleTarget | null = null;
      let bestScore = 0;
      for (const t of targets) {
        const score = dominanceScore(t.el.getBoundingClientRect());
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
        activeScore = dominanceScore(activeTarget.el.getBoundingClientRect());
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
    // frame (registered sections rarely exceeds ~10, and getBoundingClientRect
    // is the only per-band cost) so it always reflects live scroll position -
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

    function rebuildFlapBands() {
      flapBands = getSectionFlaps().map((f) => {
        const rect = f.el.getBoundingClientRect();
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

    // Writes the exact background color behind screen position y into `out`
    // (as r/g/b 0-1 numbers) if y falls inside a registered section's flap
    // band, using that section's own live per-row progress - not a
    // canvas-wide average. Returns false (leaving `out` untouched) when y
    // isn't over any registered section, so the caller can fall back to the
    // old shape-dominance-based color for those areas (e.g. the Hero, which
    // has no flap to track at all).
    function backgroundColorAt(y: number, out: { r: number; g: number; b: number }): boolean {
      for (const band of flapBands) {
        if (y < band.top || y > band.top + band.height) continue;
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
      return false;
    }

    const bandColorTmp = { r: 1, g: 1, b: 1 };

    const clock = new THREE.Clock();

    function step() {
      const t = clock.getElapsedTime();
      const { target, blend } = pickActiveTarget();
      const shapePoints = target?.shapePoints ?? null;
      const shapeRect = shapePoints ? target!.el.getBoundingClientRect() : null;
      const effectiveBlend = shapePoints ? blend : 0;

      rebuildFlapBands();

      // Fallback color for any particle not currently over a registered
      // flap band at all (e.g. still scattered in the Hero, which never
      // has a cover to track) - the previous canvas-wide blend, kept only
      // as a backstop rather than the primary path.
      if (target) {
        const orderedTargets = getParticleTargets();
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

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const idleX = p.baseX + Math.sin(t * p.speed + p.phaseX) * p.driftAmp;
        const idleY = p.baseY + Math.cos(t * p.speed + p.phaseY) * p.driftAmp;
        const idleZ = p.baseZ + Math.sin(t * p.speed * 0.6 + p.phaseZ) * (p.driftAmp * 0.5);

        let desiredX = idleX;
        let desiredY = idleY;
        let desiredZ = idleZ;

        if (shapePoints && shapeRect && shapePoints.length > 0) {
          const sp = shapePoints[i % shapePoints.length];
          // Scaled out from the marker rect's own center (not its edges) so
          // the shape grows bigger without shifting where it's centered.
          const shapeCenterX = shapeRect.left + shapeRect.width / 2;
          const shapeCenterY = shapeRect.top + shapeRect.height / 2;
          const shapeX = shapeCenterX + (sp.x - 0.5) * shapeRect.width * SHAPE_SCALE;
          const shapeY = shapeCenterY + (sp.y - 0.5) * shapeRect.height * SHAPE_SCALE;
          // Small independent wander around the assigned shape point so a
          // held shape keeps some interior motion/fill instead of every
          // particle freezing on the bare outline. Reuses each particle's
          // own idle phase/speed (offset so it doesn't sync with the idle
          // drift) rather than adding new per-particle random state.
          const wanderRadius =
            Math.min(shapeRect.width, shapeRect.height) * SHAPE_WANDER_FRACTION;
          const wanderX = Math.sin(t * p.speed * 1.3 + p.phaseX * 1.7) * wanderRadius;
          const wanderY = Math.cos(t * p.speed * 1.1 + p.phaseY * 1.9) * wanderRadius;
          const shapeZ = ((i % 7) - 3) * 26;
          desiredX = idleX + (shapeX + wanderX - idleX) * effectiveBlend;
          desiredY = idleY + (shapeY + wanderY - idleY) * effectiveBlend;
          desiredZ = idleZ + (shapeZ - idleZ) * effectiveBlend;
        }

        p.currentX += (desiredX - p.currentX) * POSITION_DAMPING;
        p.currentY += (desiredY - p.currentY) * POSITION_DAMPING;
        p.currentZ += (desiredZ - p.currentZ) * POSITION_DAMPING;

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
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      // Subtle whole-field tilt toward the mouse for a cheap sense of depth
      // without breaking the pixel-exact target mapping above.
      const targetTiltX = mouse.active ? ((mouse.y / height) - 0.5) * 0.08 : 0;
      const targetTiltY = mouse.active ? ((mouse.x / width) - 0.5) * -0.08 : 0;
      tilt.x += (targetTiltX - tilt.x) * 0.04;
      tilt.y += (targetTiltY - tilt.y) * 0.04;
      points.rotation.x = tilt.x;
      points.rotation.y = tilt.y;

      renderer.render(scene, camera);
    }

    if (prefersReducedMotion) {
      // One static frame, all particles fully scattered - no loop, no
      // listeners driving continued motion.
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        posAttr.setXYZ(i, p.baseX, p.baseY, p.baseZ);
      }
      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    } else {
      renderer.setAnimationLoop(step);
    }

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [prefersReducedMotion]);

  if (!ENABLED) return null;

  return (
    <div
      ref={mountRef}
      className="pointer-events-none fixed inset-0 z-[5]"
      aria-hidden="true"
    />
  );
}
