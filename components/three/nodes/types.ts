import type { ThreeEvent } from "@react-three/fiber";
import type { SceneNode } from "@/lib/architecture-scene";

// Shared prop shape for every per-visual-type node component (Section 1.2 of
// docs/architecture-diagram-enhancement-spec.md). The highlight/dim math
// (isEmphasized, opacity, color) is computed exactly once in the `Node`
// dispatcher in ArchitectureCanvas.tsx and handed down here - individual
// node components never re-derive it, they only render geometry and wire
// the passed-through pointer handlers onto their body mesh(es).
export type NodeVisualProps = {
  node: SceneNode;
  color: string;
  bodyOpacity: number;
  isEmphasized: boolean;
  isDimmed: boolean;
  /** Idle micro-animations still play while dimmed - the dimmed opacity
   * already communicates "irrelevant right now" without stopping motion
   * that represents "system alive" (spec Section 1.3). */
  scale: number;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
};
