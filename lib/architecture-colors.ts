import designTokens from "@/lib/design-tokens.json";
import type { FlowColorToken } from "@/lib/architecture-flows";

// Single source of truth for every color the 3D architecture scene touches -
// ArchitectureCanvas.tsx and every components/three/nodes/* component import
// from here instead of re-deriving their own copy of design-tokens.json, so
// there's exactly one place mapping semantic names to hex values (spec
// constraint: "no hardcoded per-node visuals in component code").
export const COLOR = {
  graphite: designTokens.color["bg-elevated"],
  surface: designTokens.color.surface,
  border: designTokens.color.border,
  signal: designTokens.color.signal,
  signalDim: designTokens.color["signal-dim"],
  textTertiary: designTokens.color["text-tertiary"],
  flowRequest: designTokens.color["flow-request"],
  flowBackground: designTokens.color["flow-background"],
  // Muted per-type accent colors (chunky rounded-box node redesign) - kept
  // desaturated/dark-theme-friendly rather than the saturated palette of
  // the reference image. accentWarm is shared by storage/queue/workers,
  // matching the reference's shared yellow accent across those three.
  accentCache: designTokens.color["accent-cache"],
  accentWarm: designTokens.color["accent-warm"],
  accentDatabase: designTokens.color["accent-database"],
  accentMonitor: designTokens.color["accent-monitor"],
};

export function flowColor(token: FlowColorToken): string {
  switch (token) {
    case "signal":
      return COLOR.signal;
    case "signal-dim":
      return COLOR.signalDim;
    case "flow-request":
      return COLOR.flowRequest;
    case "flow-background":
      return COLOR.flowBackground;
  }
}
