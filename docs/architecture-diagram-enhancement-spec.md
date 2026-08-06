# Architecture Diagram Enhancement Spec

> **Status: all four features below appear implemented** (confirmed via
> static code inspection — grep for key markers, not an interactive
> click-through) **but sitting uncommitted in the working tree** as of this
> note. See the repo root [`README.md`](../README.md) "Phase 4a" section for
> the current file-by-file status table and what still needs a manual
> verification pass against the acceptance checklist at the bottom of this
> doc. One deliberate deviation: Section 4.2's suggested hub glass material
> was tried and reverted — see `components/three/nodes/Hub.tsx`'s comment.

**Target files:** `components/three/ArchitectureCanvas.tsx`, `components/ArchitectureVisualizer3D.tsx`, `lib/architecture-scene.ts`, `lib/architecture-nodes.ts`
**Stack:** React Three Fiber, drei, Three.js, Next.js 15 / React 19
**Design tokens source:** `lib/design-tokens.json` (do not hardcode hex values — import from here)

## 0. Non-negotiable constraints (read first)

Everything below must be built *inside* the existing architecture, not around it:

1. **Data-driven only.** No hardcoded per-node visuals in component code. All new per-node data (geometry type, flow membership, panel copy) goes into `lib/architecture-nodes.ts` / `lib/architecture-scene.ts`, exactly like `position`, `isHub`, `caseStudySlug` do today.
2. **Fallback stays identical.** The static 2-column grid in `ArchitectureSection.tsx` is the required no-JS/no-WebGL/reduced-motion/mobile fallback. None of these features touch it.
3. **Eligibility gate stays identical.** `checkEligible()` in `ArchitectureVisualizer3D.tsx` (flag check, reduced-motion check, viewport check, WebGL check) must still gate 100% of the new features — they only exist inside `ArchitectureCanvas.tsx`, which only mounts when eligible.
4. **`prefers-reduced-motion` already excludes these users entirely** (see constraint 3), so no *additional* reduced-motion branching is needed inside the canvas — but no feature below should introduce motion that can't be paused/interrupted by hover/selection, matching current edge-pulse behavior (pulses already slow/pause contextually).
5. **Keyboard parity stays.** The bottom button bar in `ArchitectureVisualizer3D.tsx` is the keyboard-accessible mirror of pointer interaction. Any new interaction (expand panel, flow toggle) needs a keyboard-operable equivalent in that same bar pattern.
6. **Existing hover/dim/select color logic is reused, not replaced.** `isEmphasized`, `isDimmed`, `connectedIds()` already work — new features hook into these, they don't fork a parallel system.

---

## 1. Feature: Differentiated node geometry

### 1.1 Data model change

Add a `visual` field to `ArchNode` in `lib/architecture-nodes.ts`:

```ts
export type NodeVisual =
  | "hub"        // app-server — icosahedron, unchanged
  | "gateway"    // api-layer
  | "queue"      // queue
  | "cache"      // cache
  | "database"   // database
  | "storage"    // storage
  | "compute"    // workers
  | "monitor";   // monitoring

export type ArchNode = {
  id: string;
  label: string;
  description: string;
  caseStudySlug: string | null;
  visual: NodeVisual; // NEW
};
```

Assign per existing node:

| id | visual |
|---|---|
| api-layer | gateway |
| app-server | hub |
| queue | queue |
| cache | cache |
| database | database |
| storage | storage |
| workers | compute |
| monitoring | monitor |

`SceneNode` in `lib/architecture-scene.ts` should pass `visual` through unchanged (same pattern as `caseStudySlug` today).

### 1.2 Geometry spec per type

Each becomes its own small component (new file `components/three/nodes/` directory), all accepting the same props shape as today's `Node` (`node`, `hoveredId`, `selectedId`, `onHoverChange`, `onSelect`, plus a resolved `color`/`opacity`/`isEmphasized` computed once in the parent `Node` dispatcher — don't duplicate the highlight-math per type).

**`hub` (app-server)** — unchanged: `icosahedronGeometry args={[0.62, 1]}`.

**`gateway` (api-layer)** — a flattened hex-prism to read as an "entry point":
- `cylinderGeometry args={[0.42, 0.42, 0.22, 6]}` (6-sided = hexagonal prism), rotated `rotation-x={Math.PI / 2}` so the flat hex faces the camera on approach.
- Add a thin ring around the rim: `torusGeometry args={[0.42, 0.03, 8, 24]}`, same rotation, colored with `signal-dim` at rest, `signal` when emphasized (independent of body opacity, so the rim always reads as "active edge" of the system).

**`queue` (queue)** — cylinder body with 3 small rotating discs inside implying "items in transit":
- Body: `cylinderGeometry args={[0.28, 0.28, 0.62, 16]}`, upright.
- 3 child meshes: `torusGeometry args={[0.2, 0.02, 6, 16]}`, stacked at y = -0.15, 0, 0.15 inside the body, each independently rotating around the vertical axis via `useFrame` at slightly different speeds (0.6, 0.9, 1.2 rad/s) — implies continuous throughput even at rest, distinct from the idle whole-scene orbit.
- These inner rotations run always (not gated by hover), since they represent "queue has items," not "queue is selected."

**`cache` (cache)** — sphere + pulsing inner core reads as "fast/hot":
- Outer: `sphereGeometry args={[0.34, 24, 24]}`, `transparent`, low opacity (~0.4) even at rest — implies "translucent, ephemeral."
- Inner: `sphereGeometry args={[0.16, 16, 16]}`, fully opaque, `signal-dim` color, scale oscillating 0.9–1.1 on a ~0.8s sine cycle via `useFrame` (`Math.sin(clock.elapsedTime * 4) * 0.1 + 1`) — a heartbeat/pulse, always running, faster and tighter than the idle orbit rotation so it doesn't read as "the same effect" as scene idle motion.

**`database` (database)** — 3 stacked thin cylinders ("disks"):
- Three `cylinderGeometry args={[0.32, 0.32, 0.08, 20]}` stacked at y = -0.18, 0, 0.18, each with a thin gap (visually implies separable layers/shards).
- No idle animation — database should read as the most "static/solid" node type, contrast against queue/cache motion.

**`storage` (storage)** — a bucket/container silhouette:
- `cylinderGeometry args={[0.3, 0.24, 0.5, 12]}` (tapered — wider top, narrower bottom, like a bucket), plus a flat `cylinderGeometry args={[0.32, 0.32, 0.03, 12]}` lid-rim at the top edge.
- No idle animation.

**`compute` (workers)** — a small cluster of 3 tiny cubes orbiting a shared center, implying parallel worker processes:
- Central small `boxGeometry args={[0.22, 0.22, 0.22]}`.
- 3 satellite `boxGeometry args={[0.1, 0.1, 0.1]}` orbiting the center at radius 0.32, each 120° apart, rotating around local Y at 1.5 rad/s via `useFrame` — always running (implies active processing), independent of scene idle rotation and independent of hover state.

**`monitor` (monitoring)** — thin radar-sweep plane:
- Base: flattened `cylinderGeometry args={[0.34, 0.34, 0.05, 24]}`.
- A thin sweep wedge: `circleGeometry args={[0.32, 24, 0, Math.PI / 6]}` (a 30° wedge), positioned just above the base, rotating continuously around Y at ~1 rad/s, `meshBasicMaterial` colored `signal-dim` at ~0.5 opacity, `signal` at ~0.8 opacity when emphasized — reads as a literal radar sweep.

### 1.3 Material rules (apply to all types)

Keep exactly the existing logic from today's `Node` component, just applied to whichever mesh(es) make up the "body" of each type:
- `color` = `COLOR.signal` when emphasized, else `COLOR.graphite`.
- `opacity` = `0.35` when dimmed (an unrelated node is active elsewhere), else the type's own rest-opacity (`1` for most, `0.4` for cache's outer sphere as noted above).
- `emissive`/`emissiveIntensity` = same emphasized-only glow logic as today.

Idle micro-animations (queue's inner rings, cache's pulse, compute's orbiting cubes, monitor's sweep) are **independent of and additive to** the emphasized/dimmed material state — they keep running at all times, including when dimmed (just visually dimmed via the same opacity, not stopped), since they represent "system alive," not "system selected."

---

## 2. Feature: Real workflow trace animation

### 2.1 Data model: flows

New file `lib/architecture-flows.ts`:

```ts
export type FlowStep = {
  edgeFrom: string; // must match an existing node id
  edgeTo: string;   // must match an existing node id
  caption: string;  // 1-3 words, shown when packet arrives at edgeTo
};

export type ArchFlow = {
  id: string;
  label: string;       // shown on the toggle chip, e.g. "Request path"
  colorToken: "signal" | "signal-dim"; // or add 1-2 new accent tokens if you want per-flow color differentiation — see 2.5
  steps: FlowStep[];
};

export const architectureFlows: ArchFlow[] = [
  {
    id: "request",
    label: "Request path",
    colorToken: "signal",
    steps: [
      { edgeFrom: "api-layer", edgeTo: "app-server", caption: "Validating" },
      { edgeFrom: "app-server", edgeTo: "cache", caption: "Cache check" },
      { edgeFrom: "app-server", edgeTo: "database", caption: "Query" },
    ],
  },
  {
    id: "background-job",
    label: "Background job",
    colorToken: "signal-dim",
    steps: [
      { edgeFrom: "app-server", edgeTo: "queue", caption: "Enqueued" },
      { edgeFrom: "queue", edgeTo: "workers", caption: "Picked up" },
      { edgeFrom: "workers", edgeTo: "monitoring", caption: "Logged" },
    ],
  },
  {
    id: "storage-write",
    label: "Storage write",
    colorToken: "signal-dim",
    steps: [
      { edgeFrom: "app-server", edgeTo: "storage", caption: "Writing" },
      { edgeFrom: "workers", edgeTo: "monitoring", caption: "Confirmed" },
    ],
  },
];
```

Adjust step contents/captions freely — the structural point is: **a flow is an ordered list of existing edges**, nothing new is added to the graph itself (no new node/edge data), only a *sequence* is layered on top of `sceneEdges`.

### 2.2 Playback state machine

New hook, `lib/hooks/useFlowPlayback.ts`:

State:
```ts
type PlaybackState = {
  activeFlowId: string | null;
  activeStepIndex: number | null; // index into the flow's steps array
  stepStartTime: number | null;   // ms, from a shared clock
};
```

Behavior:
- `play(flowId)`: sets `activeFlowId`, `activeStepIndex = 0`, `stepStartTime = now`.
- Each step has a fixed duration (recommend **900ms travel + 500ms hold** = 1400ms per step total) before advancing `activeStepIndex`.
- On advancing past the last step: hold the final "arrived" state for ~600ms, then reset to `activeFlowId: null` (loop back to idle orbit state).
- `stop()`: immediately resets to idle, used when the user manually selects a node (selection takes visual priority over an in-progress trace — pause/cancel the trace if a node is selected mid-playback).

### 2.3 Visual behavior during a step

For the edge `(edgeFrom, edgeTo)` of the active step:
- The existing per-edge pulse (`Edge` component's `pulseRef`) is repurposed: instead of a continuous 0→1 loop, it's driven directly by step progress (`t = elapsed / 900ms`, clamped 0–1) for exactly this one edge, while all *other* edges keep their normal continuous ambient pulse (dimmed to ~0.15 opacity while a flow is playing, so the active path visually pops).
- `QuadraticBezierLine` for the active edge switches to the flow's `colorToken` color at full opacity + increased `lineWidth` (e.g. 2.2 vs default 1).
- On arrival (t reaches 1): the `edgeTo` node briefly flashes — reuse the existing `isEmphasized` emissive treatment for ~400ms even though it isn't actually hovered/selected (add a third boolean, `isFlowActive`, to the `Node` component's color logic: emphasized-if-hovered-OR-selected-OR-flowActive).
- An `Html` caption (same `Html center distanceFactor={8}` pattern already used for node labels) appears just above the arriving node for the "hold" duration, showing the step's `caption` string, then fades out (`opacity` transition, reuse `motion.duration-fast` = 0.2s from design tokens).

### 2.4 Trigger mechanism

Two entry points, both funnel into the same `useFlowPlayback` hook:

1. **Manual, via the existing bottom button bar** (`ArchitectureVisualizer3D.tsx`): add one chip per flow (`architectureFlows.map(...)`), labeled with `flow.label`, styled consistently with the existing node buttons but visually grouped separately (e.g. a thin vertical divider or a second row) so users don't confuse "highlight a node" buttons with "play a flow" buttons. Clicking calls `play(flow.id)`.
2. **Autoplay-once on first intersection**: reuse the existing `IntersectionObserver` already in `ArchitectureVisualizer3D.tsx` — when it first fires `isIntersecting`, after the canvas has mounted (`mounted === true`) and a short delay (~1200ms, so it doesn't fire during the entry transition), auto-play the `"request"` flow exactly once. Track via a `useRef<boolean>` so it never re-fires on scroll-out/scroll-in. This is the "impressive on first scroll" moment — no user action required to see it once.

Since `checkEligible()` already excludes `prefers-reduced-motion` users from the whole 3D canvas, no additional reduced-motion guard is needed for the autoplay specifically — but do **not** loop the autoplay; one pass only, per constraint 4.

### 2.5 Optional: per-flow color differentiation

If you want each flow visually distinct rather than reusing `signal`/`signal-dim`, add 1-2 new tokens to `design-tokens.json` under `color` (e.g. `flow-request`, `flow-background`) rather than hardcoding hex in the component — keeps the "no hardcoded visuals" rule intact. Keep new tokens close in value to the existing near-monochrome palette (e.g. slightly warm vs slightly cool greys) rather than introducing saturated color, to stay consistent with the site's restrained aesthetic.

---

## 3. Feature: Click-to-expand detail panel

### 3.1 Interaction states

Extend the existing `hoveredId`/`selectedId` model in `ArchitectureVisualizer3D.tsx` with one more piece of state:

```ts
const [expandedId, setExpandedId] = useState<string | null>(null);
```

Flow:
- Click/Enter on a node when nothing is expanded → existing behavior (dolly camera + set `selectedId`) **plus** set `expandedId` to that node's id.
- While a node is expanded: a panel appears (see 3.2). A second click on the *same* node, or a "View case study" button inside the panel (if `caseStudySlug` isn't null), or pressing Escape, collapses it.
- Clicking a *different* node while one is expanded: collapse the current panel first (respect its collapse animation, ~150ms), then run the normal select+dolly+expand sequence for the new node — don't hard-cut between panels.
- Clicking empty space (background) or pressing Escape: `setSelectedId(null); setExpandedId(null)` — camera dollies back to `DEFAULT_CAMERA_POS` exactly as `selectedId: null` already does today.

### 3.2 Panel content & layout

Rendered via drei's `Html`, anchored to the expanded node's position (same technique as the existing label, but a second `Html` block, larger, offset to the side rather than centered — e.g. `position={[0.9, 0.3, 0]}` relative to the node's local group so it doesn't overlap the node itself).

Content, in order:
1. Node label (reuse existing mono-caps styling).
2. Full `description` string (already exists in `ArchNode`/`SceneNode` — currently only shown in the 2D fallback grid, not in the 3D view at all today).
3. If `caseStudySlug !== null`: a "View case study →" button/link that triggers the same `onDollyComplete` → `router.push` flow already wired up, so this becomes an *additional* path to case studies, not a replacement for the existing click-to-navigate behavior. Decide: does a first click expand-only, and does navigation require the explicit button? (Recommended — matches "expandable component" framing better than instant-navigate.) If so, `handleDollyComplete` should no longer auto-navigate on arrival; navigation only fires from the panel's button.
4. If `caseStudySlug === null`: no button, panel is read-only detail (matches today's fallback grid, where these nodes are plain non-linked divs).

### 3.3 Animation

- Panel entrance: opacity 0→1 and a small scale/translate (e.g. `translateX(-8px) → 0`) over `motion.duration-base` (0.4s) using `ease-out-expo` from design tokens — consistent with the rest of the site's motion language, not a new easing curve.
- Panel exit: reverse, but faster — `motion.duration-fast` (0.2s), so collapsing feels snappier than expanding (standard UI convention: open slow enough to track, close fast so it doesn't feel laggy).
- Node itself scales up slightly while expanded (e.g. `1.0 → 1.08`) via the existing `useFrame`-driven approach or a simple CSS-in-JS style transform on the wrapping `group`'s scale, lerped over the same duration.

### 3.4 Keyboard/accessibility

- The existing bottom button bar's buttons should, on click, trigger the *same* select+expand behavior as clicking the 3D mesh (they already call `handleSelect`, which needs to also set `expandedId` now).
- Escape key: add a top-level `keydown` listener (in `ArchitectureVisualizer3D.tsx`, cleaned up on unmount) that collapses/deselects when `expandedId !== null`.
- The panel's "View case study" link/button, when rendered via `Html`, is a real DOM `<a>`/`<button>` — make sure `pointerEvents` on that specific element is `"auto"` (unlike the plain label `Html`, which is `pointerEvents: "none"`), and that it's reachable via Tab once expanded (drei's `Html` renders real DOM nodes, so natural tab order applies — just verify it doesn't get placed *before* the bottom button bar in DOM order in a confusing way; test with keyboard only).

---

## 4. Feature: Lighting & material polish

### 4.1 Bloom

Add `@react-three/postprocessing` (new dependency — confirm version compatible with `@react-three/fiber@9.6.1` / `three@^0.170.0` before installing).

In `ArchitectureCanvas.tsx`, wrap the scene content with:
```tsx
<EffectComposer>
  <Bloom
    intensity={0.4}
    luminanceThreshold={0.6}
    luminanceSmoothing={0.2}
    mipmapBlur
  />
</EffectComposer>
```
`luminanceThreshold={0.6}` is the key tuning value — it should be high enough that only emphasized/emissive elements (active nodes, active-flow edges, pulses) bloom, while the base graphite/surface-colored geometry (which sits well below that luminance) stays crisp and unaffected. Tune this value visually once implemented; too low and everything blooms (loses the "signal" contrast that makes highlighting meaningful today).

### 4.2 Hub material

Try `MeshTransmissionMaterial` (drei) on the hub (`app-server`) only, replacing its `meshStandardMaterial`:
```tsx
<MeshTransmissionMaterial
  color={color}
  thickness={0.4}
  roughness={0.3}
  transmission={0.9}
  ior={1.3}
  chromaticAberration={0.02}
/>
```
Keep this to the hub only — applying a glass material to every node would be visually noisy and would fight with the new per-type geometry differentiation from Section 1. The hub is the one node designed to stand out (it's already the only non-orbiting, larger element), so it's the natural candidate for the one "special material."

### 4.3 Mouse parallax

In `OrbitGroup` (`ArchitectureCanvas.tsx`), add a subtle tilt driven by normalized pointer position (R3F's `useThree(({ pointer }) => pointer)` gives you `-1..1` normalized coords for free, no extra event wiring needed):

```tsx
useFrame(() => {
  if (!groupRef.current) return;
  const targetX = pointer.y * 0.08; // radians, small
  const targetY = pointer.x * 0.08;
  groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.05);
  // combine additively with the existing idle rotation.y increment — don't overwrite it, add to it
});
```
Keep the max tilt small (≤ ~0.08 rad ≈ 4.5°) — this should read as "the scene has depth/weight," not as an obvious drag-to-rotate control (you don't have orbit controls enabled today, and this spec doesn't add them — this is ambient parallax only, not user-driven camera control).

---

## 5. File change map

| File | Change |
|---|---|
| `lib/architecture-nodes.ts` | Add `visual: NodeVisual` field per node |
| `lib/architecture-scene.ts` | Pass `visual` through to `SceneNode`; no other changes |
| `lib/architecture-flows.ts` | **New** — flow definitions (Section 2.1) |
| `lib/hooks/useFlowPlayback.ts` | **New** — playback state machine (Section 2.2) |
| `components/three/nodes/*.tsx` | **New** — one component per `NodeVisual` type (Section 1.2), plus a small dispatcher that replaces today's `if (node.isHub) ... else RoundedBox` branch in `Node` |
| `components/three/ArchitectureCanvas.tsx` | Node dispatcher wiring, `EffectComposer`/`Bloom`, hub `MeshTransmissionMaterial`, `OrbitGroup` parallax, flow-driven edge override (Section 2.3), expand-panel `Html` block (Section 3.2) |
| `components/ArchitectureVisualizer3D.tsx` | `expandedId` state, Escape key handler, flow-toggle chips in the bottom bar, autoplay-once trigger (Section 2.4) |
| `package.json` | Add `@react-three/postprocessing` |

## 6. Suggested build order

1. Section 4 (lighting polish) — lowest risk, purely additive, validates visually fastest.
2. Section 1 (node geometry) — data model change + new components, no interaction-logic changes.
3. Section 2 (workflow trace) — builds on Section 1's edge/node primitives.
4. Section 3 (expand panel) — highest interaction complexity, benefits from 1 & 2 already being stable.

## 7. Acceptance checklist

- [ ] Static fallback grid in `ArchitectureSection.tsx` renders unchanged for reduced-motion/mobile/no-WebGL/flag-off users
- [ ] Existing keyboard tab order and bottom button bar still highlight nodes correctly
- [ ] Hover/select/dim color logic (`connectedIds`, `isEmphasized`, `isDimmed`) still drives all node/edge coloring, including new geometry types
- [ ] Idle per-type micro-animations (queue rings, cache pulse, compute cluster, monitor sweep) run continuously regardless of hover/select state, only dimming in opacity when irrelevant
- [ ] Exactly one flow autoplays once per session on first scroll-into-view, never loops
- [ ] Manually triggering a flow visually distinguishes the active edge path from ambient edge pulses
- [ ] Selecting a node mid-flow-playback cancels the flow cleanly (no orphaned mid-animation state)
- [ ] Expand panel opens/closes via mouse, keyboard (Enter to expand, Escape to collapse), and the bottom button bar
- [ ] "View case study" navigation still lands on the correct `/work/[slug]` route
- [ ] Bloom only affects emphasized/emissive elements, not base geometry
- [ ] No new hardcoded hex colors — everything traces back to `design-tokens.json`
