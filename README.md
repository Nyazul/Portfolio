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

**Phases 1–4b are all committed and stable** (working tree clean):
- Phase 1 — content & design system
- Phase 2 — GSAP section-flip motion + magnetic hover
- Phase 3 — particle system (every section)
- Phase 4a — 3D architecture visualizer (`9a5f94b`)
- Phase 4b — live GitHub metrics (`35e95f2`)

The two genuinely outstanding things before this site is done are: (1) the
**interactive QA pass** the 3D visualizer never got (static analysis only so far),
and (2) the **environment/secrets** items in "Before this goes live" below —
a real `GITHUB_TOKEN`, a real `RESEND_API_KEY`, and the domain pointing at
Vercel. The contact form's email provider is wired (Resend) and degrades to
log-only until `RESEND_API_KEY` is set.

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

### Phase 4a — 3D architecture visualizer ✅ committed
The base visualizer (hub-and-satellite layout, hover/select, camera dolly,
click-through to case studies, static-grid fallback) plus **all four**
enhancements from `architecture-diagram-enhancement-spec.md` are implemented
and committed (`9a5f94b`). The four enhancement features:

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

**Remaining action for Phase 4a — the interactive QA pass it never got:**
1. Run it (`npm run dev` — `.env.local` already has
   `NEXT_PUBLIC_ENABLE_3D_VIZ=true`) and manually walk the acceptance
   checklist at the bottom of `architecture-diagram-enhancement-spec.md` —
   hover, click, keyboard-only nav, Escape, flow chips, resize below 768px,
   toggle reduced-motion, throw the flag to `false`. Nothing in this doc
   substitutes for actually looking at it. This is the one outstanding item
   for Phase 4a; the code itself is committed and lint/build-clean.
2. Optional history hygiene: an early "mhdgyug" commit has an
   accidental/auto-generated message — consider `git commit --amend` on it
   before pushing anywhere public.

### Phase 4b — live GitHub metrics ✅ committed
Build in `35e95f2`, per PRD Section 9.4:
- `app/api/github-metrics/route.ts` (server-side only — the token is never
  exposed client-side) → `lib/github-metrics.ts`, which fetches public repo
  count, the contribution calendar, and a days-active total from the GitHub
  GraphQL API using `GITHUB_TOKEN`, **hourly-cached** via Next's fetch
  `revalidate: 3600`.
- Mandatory fallback: any failure (missing/expired token, rate limit, network
  error, malformed response) falls through to the committed snapshot
  `lib/github-metrics-fallback.json`; if that hasn't been seeded yet either,
  `StackMetrics.tsx` renders an honest "unavailable" rather than fake numbers
  (same principle as the self-assessed bars).
- `scripts/generate-github-snapshot.mjs` (`npm run github:snapshot`) is the
  one-time/occasional generator for that fallback file — run locally with a
  real token, never committed.

**Remaining for Phase 4b — the live path isn't testable until a real token
exists** (see "Before this goes live" below): `GITHUB_TOKEN` is still empty,
so `lib/github-metrics-fallback.json` is also still empty (`fetchedAt: ""`),
and the section reports "unavailable".

### Phase 5 — polish, case studies, motion, new content (branch `feat/portfolio-upgrade`)
- **Accent:** one orange accent per theme (`accent`/`accentDim` in
  `lib/theme-colors.ts`), reserved for state and emphasis: active nav,
  focus, selection, status dots, key numbers, top heatmap bucket. Particles
  and the 3D scene stay monochrome.
- **Fixes:** root-relative nav hrefs (`/#about`) so nav works from `/work/*`;
  Inter + JetBrains Mono actually loaded via `next/font`; generated favicon
  (`app/icon.tsx`); custom 404; skip link; mobile sections no longer forced
  to 140vh. `<ParticleSystem/>` moved from the root layout into
  `app/page.tsx`: it was scattering over case-study text, and `/work/*` now
  ships about half the JS (~159 KB gz vs ~325 KB). Next's per-route "First
  Load JS" for `/` now *looks* bigger only because three.js moved from the
  layout's accounting into the page's; the real total for `/` went down
  slightly.
- **Case studies:** structured `problem / approach / outcome / lessons` data
  in `lib/case-studies.ts`, with simplified code samples highlighted at
  build time by shiki (`components/case-study/CodeBlock.tsx`, server-only),
  a race-condition diagram, key-facts strip, sticky TOC, prev/next and
  per-study OG images.
- **Motion:** `RevealText` section headlines, desktop-only custom `Cursor`
  (`data-cursor="Label"` on any element gives it a labelled state), hero
  scroll-out + velocity marquee, editorial case-study rows, stack tiers
  instead of % bars.
- **Content:** Principles section (05), "Now" block in About, footer CTA.
  Section themes were rebalanced. Each component's `SectionSplit theme`
  must match its `SectionReveal theme` in `app/page.tsx`.
- **`TODO(nyazul)` convention (`lib/todo.ts`):** facts only you can supply
  show as dashed accent placeholders in dev and are omitted in production.
  `grep -rn "TODO" lib components` lists them.

### Performance pass (low-end devices)
- **Device tier** (`lib/device-tier.ts`): `high` / `low` from CPU cores,
  `deviceMemory` and Save-Data. Force one with `?perf=low` / `?perf=high`.
- **Particles** (`components/motion/particle-engine.ts`): three.js is now
  `import()`ed when the browser is idle, so `/` first-load JS went from
  426 KB to 254 KB. 1,800 particles on `low` (5,000 on `high`), no MSAA,
  pixel ratio capped at 1.5 (1 on `low`), element rects cached instead of
  ~15 `getBoundingClientRect()` calls per frame, and a runtime step-down
  that halves the particle count if frames average over 24 ms.
- **3D visualizer**: render loop stops while scrolled out of view
  (`frameloop="never"`); `low` tier and any device drei's
  `PerformanceMonitor` flags as slow drop bloom, sparkles and go to 1x DPR.
- **Hero**: intro lands in ~1 s instead of ~5 s; scroll-out blur only on
  `high`. Marquee stops offscreen; the nav's (invisible) backdrop blur is gone.

### Phase 6 — interactive proof, status, palette, notes
- **"Break it yourself" playground** in the billing case study
  (`components/case-study/QuotaRacePlayground.tsx`, model in
  `lib/quota-race.ts`): two requests race for the last unit of quota under
  three implementations (read→check→write, check then atomic +1, guarded
  UPDATE) with an adjustable arrival gap. Wired via `playground:
  "quota-race"` on an `ApproachStep`.
- **Live status** (`app/api/health/route.ts`, poller `lib/health.ts`): the
  footer's `StatusPanel` and the hero's `HeroRequestLog` share one poller,
  which only runs while one of them is on screen and the tab is visible.
  Latency is measured from the visitor's browser; build SHA/time come from
  `next.config.mjs` (`VERCEL_GIT_COMMIT_SHA` or local git). There is no
  real uptime percentage - that needs an external monitor (e.g. Better
  Stack / UptimeRobot) if you want one later.
- **⌘K / Ctrl+K terminal palette** (`components/CommandPalette.tsx`),
  mounted in the root layout with only slugs/titles passed in. `help`
  lists commands; a few are unlisted (`sudo hire-me`, `rm -rf /`,
  `coffee`, `vim`).
- **Shared-element route transitions** (`components/ViewTransitions.tsx`,
  a small in-house replacement for the `next-view-transitions` package):
  case-study titles (`lib/view-transitions.ts`) and note titles morph
  between list and page; the nav is pinned with its own transition name.
  A route that hasn't rendered within 2s skips the animation instead of
  hitting Chrome's 4s view-transition timeout (which the package surfaced
  as an uncaught `TimeoutError`). Back/forward navigations don't animate.
- **Notes** (`lib/notes.ts`, `/notes`, `/notes/[slug]`, `/notes/rss.xml`,
  sitemap). Notes marked `draft: true` exist in dev only. **The two seeded
  notes are drafts written from case-study facts - review/rewrite them in
  your own voice, then set `draft: false` to publish.** The footer link and
  palette entries appear once something is published.

### Phase 7 — projects, loader, edge text, orange cursor
- **Projects** (`lib/projects.ts`, `/projects/[slug]`, home "Work" section via
  `components/ProjectsList.tsx`): architecture walkthroughs of Generic
  WorkFlow and RealEstate CRM, written from the real codebases in
  `../YSM/` (class names, schedules, Kafka topics, scopes all verified
  there in Oct 2026), plus an "Also built" list. Each page: challenge,
  scroll-synced architecture journey (`components/project/ArchitectureJourney.tsx`),
  components, a playground, and links to related case studies.
  - `PermissionPlayground` + `lib/permission-model.ts`: a port of Generic
    WorkFlow's `AuthorizationService`/`GrantEvaluator` rules (owner/admin
    bypass, allow-only union of role grants + overrides, 5 scopes,
    traceable groups).
  - `ProjectCreationPlayground` + `lib/project-creation.ts`: RealEstate's
    `createProject` transaction with S3 uploads, failure injection
    (returns false → compensation; throws → orphaned S3 objects).
- **Boot loader** (`components/BootLoader.tsx`): first visit per session,
  never under reduced motion; skip decided pre-paint by an inline script in
  `app/layout.tsx` (`lib/boot.ts` key); CSS failsafe at 5s and a JS timer
  failsafe that always releases the hero intro (`lib/intro.ts`).
- **Edge text** (`components/motion/EdgeTextRows.tsx`): replaces the hero
  marquee (`VelocityMarquee` deleted). Words live in its `ROWS` constant.
- **Cursor**: solid orange dot/ring, black over orange backgrounds; no
  more `mix-blend-difference`.
- **Sections now**: 01 About · 02 Architecture · 03 Projects
  (`ProjectsSection`, dark, a plain themed wrapper rather than a
  `SectionReveal` since it follows the dark Architecture section) · 04 Case
  studies (`id="work"`) · 05 Stack · 06 Principles · 07 Experience ·
  08 Contact. Stack and Principles drop out of the desktop nav pill between
  md and lg (`wide: true` in `Nav.tsx`) so eight links fit.
- **Particle shapes**: every shape is normalised in `lib/particle-shapes.ts`
  (centred, larger extent = `SHAPE_SPAN`), and on md+ each section's shape
  anchor is a sticky half-viewport box (`SectionSplit`), so shapes form in
  view, at the same size, for the whole section. `particle-engine.ts`
  computes sticky positions itself because its rect cache is
  document-relative.
- **Case studies match the code**: billing now tells the real three-stage
  story (prototype read-modify-write → today's atomic increment with a Java
  check → proposed guarded UPDATE), and S3 describes the real compensation
  path with "clean up on every rollback" as the next fix.

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
- [x] Commit and verify Phase 4a (3D visualizer) — committed `9a5f94b`
      (interactive QA pass still outstanding — see Phase 4a section above)
- [x] Build Phase 4b (live GitHub metrics) — committed `35e95f2`
      (live render still needs a real token)
- [x] Update `.env.example` comment for `NEXT_PUBLIC_ENABLE_3D_VIZ` (no longer
      says "not built yet")
- [x] Wire an actual email provider in `app/api/contact/route.ts` — now sends
      via Resend's REST API; degrades to validate+log when `RESEND_API_KEY`
      is unset (still needs the real key set in Vercel, see below)
- [ ] Generate the `GITHUB_TOKEN` PAT and set it in Vercel's env vars
      (needed for Phase 4b)
- [ ] Point `nyazulansari.duckdns.org`'s CNAME at Vercel and add it as a
      custom domain in Vercel project settings (or swap in a purchased
      domain — `NEXT_PUBLIC_SITE_URL` is the only place it's referenced)
- [ ] iOS Safari real-device check (see above)
- [ ] Re-run `npm run lint` and clear whatever warnings remain (trivial, low
      priority; `Database.tsx`'s old unused-var warning is already gone)

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
