import type { Point } from "@/lib/particle-shapes";
import type { SectionTheme } from "@/lib/theme-colors";

// Bridges the section components (which know their own DOM rect and which
// shape they want) with the single global <ParticleSystem/> canvas (which
// doesn't know about sections at all - it just asks "what's the best target
// right now?" every frame). Deliberately not React state: registration
// happens in refs/effects on mount/unmount, and reads happen once per
// animation frame inside a rAF loop - running this through React state would
// mean a re-render per frame, which is exactly what we don't want for a
// 60fps loop.
export type ParticleTarget = {
  id: string;
  el: HTMLElement;
  // null = "no shape here, just let particles drift" (Hero / first section).
  shapePoints: Point[] | null;
  theme: SectionTheme;
  // Page order, used only to keep the idle scatter zone sensible when no
  // target is dominant (e.g. still picks *something* nearby rather than
  // defaulting to document origin).
  order: number;
};

const targets = new Map<string, ParticleTarget>();

export function registerParticleTarget(target: ParticleTarget) {
  targets.set(target.id, target);
}

export function unregisterParticleTarget(id: string) {
  targets.delete(id);
}

export function getParticleTargets(): ParticleTarget[] {
  return Array.from(targets.values()).sort((a, b) => a.order - b.order);
}

// How visually "revealed" a section's own background is, keyed by the same
// id used for its ParticleTarget - 0 means the row-flap cover (drawn in the
// PREVIOUS section's color, see SectionReveal) is still fully hiding this
// section's real background, 1 means it has fully wiped away. SectionReveal
// reports this every frame from the same GSAP scrub driving the flap
// animation, so the particle field's color can track the actual visible
// background instead of guessing from geometry alone - that mismatch was
// exactly what made particles render in the wrong (non-inverse) color while
// mid-flip. Sections with no flap (Hero, or reduced-motion/mobile fallback)
// simply never call the setter, so they stay at the default of 1 - "fully
// this section's own color, no transition to track".
const revealProgress = new Map<string, number>();

export function setRevealProgress(id: string, progress: number) {
  revealProgress.set(id, progress);
}

export function getRevealProgress(id: string): number {
  return revealProgress.get(id) ?? 1;
}

// The row-flap cover is a staggered checkerboard, not a single wipe - some
// rows can be fully open while their neighbors are still fully closed. A
// single scalar (revealProgress above) can only describe an average of
// that, which is exactly what produced the "wrong color on the flipping
// rows" bug: the canvas-wide color was some blended-average tone that
// matched neither the still-covered rows nor the already-revealed ones.
//
// SectionFlap decouples "where is this section's cover on screen" from
// shape-dominance entirely - <ParticleSystem/> uses it to look up, for a
// given particle's own screen Y, which section's flap (if any) is behind
// it and which of that flap's rows, independent of which section currently
// "wins" for shape-convergence purposes.
export type SectionFlap = {
  id: string;
  // The section's full container - same element the row flaps are
  // positioned against as percentages, so this rect's top/height is what
  // row banding math needs to be pixel-accurate.
  el: HTMLElement;
  rows: number;
  // This section's own theme and the theme of the section above it (the
  // flap's color) - stored here directly rather than cross-referenced from
  // the ParticleTarget map by id, so flap lookups never depend on a target
  // with the same id having been registered (or registered first).
  theme: SectionTheme;
  prevTheme: SectionTheme;
};

const flaps = new Map<string, SectionFlap>();

export function registerSectionFlap(flap: SectionFlap) {
  flaps.set(flap.id, flap);
}

export function unregisterSectionFlap(id: string) {
  flaps.delete(id);
}

export function getSectionFlaps(): SectionFlap[] {
  return Array.from(flaps.values());
}

// Per-row reveal progress (0 = still fully covered by the flap, showing
// prevTheme; 1 = fully wiped away, showing this section's own theme),
// keyed by section id, one entry per row top-to-bottom. Reported every
// scrub tick by reading each flap row's own live scaleY - not derived from
// timeline math - so it's exact regardless of stagger/duration/easing.
const rowRevealProgress = new Map<string, number[]>();

export function setRowRevealProgress(id: string, progress: number[]) {
  rowRevealProgress.set(id, progress);
}

export function getRowRevealProgress(id: string): number[] | null {
  return rowRevealProgress.get(id) ?? null;
}
