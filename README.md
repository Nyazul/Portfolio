# Nyazul Ansari — Portfolio

**Start here if you're picking this up in a new session with no prior context.**

Two spec docs in `docs/`:
- [`portfolio-prd-v1.md`](./docs/portfolio-prd-v1.md) — original vision doc:
  design tokens, content, IA, the phased build plan (Phases 1–4). Historical
  source of truth for *why* things are built the way they are.
- [`architecture-diagram-enhancement-spec.md`](./docs/architecture-diagram-enhancement-spec.md)
  — a later, much more detailed spec for the Phase 4 3D visualizer specifically
  (differentiated node geometry, workflow-trace animation, click-to-expand
  panels, bloom/lighting polish). Written after the base 3D visualizer already
  existed; **this doc's own status section below is the current living
  source of truth** — check here first, then the two spec docs for the "why."

## Current status (as of this writing)

**Phases 1–3 are committed and stable.** Phase 4 (3D architecture visualizer)
is **built and passing lint/build, but sitting uncommitted in the working
tree** — some of it was done directly against the repo (outside a Claude
session) between the last commit and now. A new session's first move should
be `git status` / `git diff` to see exactly what's staged vs not, review it,
and commit — don't assume a clean tree.

### Phase 1 — content & design system ✅ committed
All sections, `/work/[slug]` case-study routes, contact form (honeypot +
server-side validation), sitemap/robots/OG image/JSON-LD.

### Phase 2 — motion polish ✅ committed
GSAP `ScrollTrigger` pinned row-flip reveal between sections
(`components/motion/SectionReveal.tsx`), magnetic-pull hover on nav/CTAs
(`components/motion/MagneticHover.tsx`), sections alternating dark/light
(`lib/theme-colors.ts`) so the row-flip reads as a real color change.
Reduced-motion and mobile both have verified real fallbacks (checked via raw
HTML inspection, not just eyeballed).

### Phase 3 — particle system ✅ committed
Grew past the original PRD scope (hero-only background) into a system used
across every section:
- `components/motion/ParticleSystem.tsx` + `lib/particle-store.ts` — this
  **replaced** the earlier separate `ParticleField.tsx`/`SectionParticles.tsx`
  split (consolidated in the "Improved particle effect" commit, done outside
  a Claude session — if you find references to the old file names anywhere
  stale, they're leftover, the current single source is `ParticleSystem.tsx`).
- `components/motion/SectionSplit.tsx` — 2:1 content/particle-space grid,
  alternating sides per section.
- `lib/particle-shapes.ts` — original abstract marks per section (avatar,
  node-graph, document, bar-chart, timeline, envelope), built from
  circle/arc/line primitives, never a real logo reproduction.
- Kill switch: `NEXT_PUBLIC_ENABLE_PARTICLES`.

### Phase 4a — 3D architecture visualizer: built, uncommitted, needs review
The base visualizer (hub-and-satellite layout, hover/select, camera dolly,
click-through to case studies, static-grid fallback) plus **all four**
enhancements from `architecture-diagram-enhancement-spec.md` appear to be
implemented:

| Feature | File(s) | Status |
|---|---|---|
| Differentiated node geometry (gateway/queue/cache/database/storage/compute/monitor/hub, each its own shape + idle micro-animation) | `components/three/nodes/*.tsx` | Present, matches spec's per-type breakdown |
| Workflow-trace animation (flows travel along edges, autoplay-once on first scroll-into-view, manual chips in the button bar) | `lib/architecture-flows.ts`, `lib/hooks/use-flow-playback.ts`, wired into `ArchitectureCanvas.tsx` + `ArchitectureVisualizer3D.tsx` | Present, autoplay guarded by a `useRef` so it can't re-fire |
| Click-to-expand detail panel (`expandedId` state, Escape to collapse, keyboard parity via the button bar) | `ArchitectureVisualizer3D.tsx` | Present |
| Bloom + parallax lighting polish | `ArchitectureCanvas.tsx` (`EffectComposer`/`Bloom`, pointer-driven tilt lerp) | Present |
| Hub material | `components/three/nodes/Hub.tsx` | **Deliberately deviated from the spec** — the spec suggested `MeshTransmissionMaterial` (glass look); it was tried and reverted per the code comment ("read as out-of-place against the matte toy-block aesthetic used everywhere else"). Hub stays visually distinct via size/geometry only. This is a documented design decision, not an oversight — don't re-add glass without a reason. |

**Eligibility gate** (`checkEligible()` in `ArchitectureVisualizer3D.tsx`)
correctly requires: `NEXT_PUBLIC_ENABLE_3D_VIZ === "true"`, no
`prefers-reduced-motion`, viewport ≥ 768px, and a real WebGL context — all
four gate 100% of the new features, and the static 2D grid
(`ArchitectureSection.tsx`) stays in the DOM underneath (just `invisible`,
not removed, so there's no layout jump) until the 3D version confirms it has
mounted. `.env.local` already has this flag set to `true` for local dev.

**What I verified this session (static analysis only, not interactive QA):**
- `npm run lint` — clean (2 pre-existing warnings, no errors: an
  `exhaustive-deps` warning in `SectionReveal.tsx`, an unused var in
  `Database.tsx` — both harmless, worth a quick cleanup pass but not
  blocking).
- `npm run build` — clean production build, 200KB First Load JS for `/`
  (barely moved from Phase 3's 196KB — confirms the R3F/drei/three/
  postprocessing bundle is properly lazy-loaded behind the
  `IntersectionObserver`, not in the initial bundle).
- Grepped for each spec feature's key markers (state variables, imports,
  wiring) to confirm presence — did **not** re-verify this interactively
  (no screenshot/click-through pass this session, unlike Phases 2–3).

**What a new session should do with this, in order:**
1. `git status` / `git diff` — see the actual uncommitted state, don't trust
   this doc's snapshot if time has passed.
2. Run it (`npm run dev`, ensure `.env.local` has `NEXT_PUBLIC_ENABLE_3D_VIZ=true`)
   and manually walk the acceptance checklist at the bottom of
   `architecture-diagram-enhancement-spec.md` — hover, click, keyboard-only
   nav, Escape, flow chips, resize below 768px, toggle reduced-motion, throw
   the flag to `false`. Nothing in this doc substitutes for actually looking
   at it.
3. Once verified, commit it (it's been sitting uncommitted across at least
   one prior "mhdgyug" commit already — that name suggests an accidental/
   auto-generated commit message upstream of this session; consider whether
   history needs cleanup, e.g. `git commit --amend` on that message, before
   pushing anywhere public).
4. Then move to Phase 4b below.

### Phase 4b — live GitHub metrics: not started
`components/StackMetrics.tsx` still shows only the static self-assessed
bars with a "Live GitHub stats — Phase 4" placeholder label. Nothing has
been built here: no API route, no fetch logic, no caching. Per PRD Section
9.4, this needs:
- A server-side Route Handler (never client-side — the token can't be
  exposed) fetching public repo count / language share / contribution
  calendar from GitHub's API using an authenticated fine-grained PAT
  (`GITHUB_TOKEN` env var already scaffolded in `.env.example`, currently
  empty — you'll need to generate one: read-only, public-metadata scope,
  explicit expiration).
- Caching via `revalidate` or a Vercel Cron job writing to KV/Edge Config,
  so the page never depends on GitHub's live uptime.
- A mandatory cached-fallback render path if the live fetch fails or the
  token expires — this must hit the same fallback as any other failure,
  not a distinct unhandled error state (see PRD 9.4's exact JSON shape for
  the cached snapshot).

## Worth checking yourself (nobody has verified these on real devices)

- **iOS Safari pin behavior** (PRD 7.1) — the pinned `ScrollTrigger`
  row-flip is a known risk on iOS Safari's dynamic toolbar. Never tested on
  a real device from any session so far.
- **The whole Phase 4a 3D visualizer**, interactively, per the acceptance
  checklist in the enhancement spec — see above, static analysis only.
- Reduced-motion toggle end-to-end across all three motion systems (GSAP
  reveal, particles, 3D viz) together, not just individually.

## Before this goes live

- [x] Résumé at `public/Nyazul_Ansari_Resume.pdf`, linked from Nav/Footer
- [ ] Commit and verify Phase 4a (3D visualizer) — see above
- [ ] Build Phase 4b (live GitHub metrics) — see above
- [ ] Wire an actual email provider in `app/api/contact/route.ts` (currently
      validates and logs only — see the TODO in that file)
- [ ] Generate the `GITHUB_TOKEN` PAT and set it in Vercel's env vars
      (needed for Phase 4b)
- [ ] Point `nyazulansari.duckdns.org`'s CNAME at Vercel and add it as a
      custom domain in Vercel project settings (or swap in a purchased
      domain — `NEXT_PUBLIC_SITE_URL` is the only place it's referenced)
- [ ] iOS Safari real-device check (see above)
- [ ] Fix the two lint warnings noted above (trivial, low priority)
- [ ] `.env.example`'s comment on `NEXT_PUBLIC_ENABLE_3D_VIZ` still says
      "not built yet" — stale, update it once Phase 4a is committed

## Development

```bash
npm install
npm run dev
```

Requires Node 18.18+ (built and tested on Node 22).

### Machine-specific gotchas already fixed, worth knowing about

- **This machine has `NODE_ENV=production` set globally in the shell.**
  `npm install` silently skips devDependencies under that env var. If a
  future `npm install` looks like it only added a handful of packages,
  that's why — run `NODE_ENV=development npm install` explicitly. The
  `dev`/`build`/`start` scripts in `package.json` already hardcode the
  correct `NODE_ENV` per-script so `npm run dev`/`build`/`start` themselves
  are safe regardless of the shell's ambient value — it's only a bare
  `npm install` (or any other raw npm/node invocation) that can get bitten.
- **`next` is pinned to `15.5.20`**, not left on a caret range — the
  originally-scaffolded `15.4.1` had a critical RCE (CVE-2025-66478) plus
  follow-up DoS/cache-poisoning CVEs. Don't downgrade without checking
  `npm audit` first. One moderate transitive `postcss` advisory remains
  nested inside `next`'s own dependency tree with no upstream fix yet —
  not worth forcing (would mean downgrading Next to version 9). Worth
  re-checking `npm audit` occasionally.
- **Dev server process hygiene:** this project has repeatedly ended up with
  stale `next-server`/`next dev` processes surviving across sessions/crashes
  and holding port 3000, causing a fresh `npm run dev` to silently bind
  3001+ instead (or, worse, a stale process serving an out-of-date `.next`
  build alongside a new one, producing confusing `ENOENT` errors on
  `required-server-files.json`). Before starting a dev server: check
  `ps aux | grep -i "next-server\|next dev"` and kill anything already
  running first.
- **`.gitignore` had a blanket `*.md` rule** that was silently excluding
  `docs/architecture-diagram-enhancement-spec.md` from git entirely — it
  existed only on disk, never committed, and would have been lost on a
  fresh clone. Removed the rule (this session). `docs/portfolio-prd-v1.md`
  had escaped this only because it was already tracked before the `*.md`
  line was added — .gitignore doesn't retroactively untrack files. If you
  add new markdown docs, double check `git status` actually sees them.
