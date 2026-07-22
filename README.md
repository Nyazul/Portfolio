# Nyazul Ansari — Portfolio

Spec: [docs/portfolio-prd-v1.md](./docs/portfolio-prd-v1.md) — read this first,
it's the source of truth for design tokens, content, and the phased build plan.

## Status: Phase 3 complete (particle field, expanded beyond the original spec)

- **Phase 1** (content & design system): all sections, `/work/[slug]` routes,
  contact form with honeypot + validation, sitemap/robots/OG/JSON-LD.
- **Phase 2** (motion polish): GSAP `ScrollTrigger` pinned row-flip reveal on
  every section below the hero (`components/motion/SectionReveal.tsx`), a
  reusable magnetic-pull hover on nav links and hero CTAs
  (`components/motion/MagneticHover.tsx`), sections alternating dark/light
  (`lib/theme-colors.ts`) so the row-flip reads as a real color transition.
  Reduced-motion and mobile both have real fallbacks, verified via raw HTML
  inspection, not just eyeballed.
- **Phase 3** (this round) grew past the original PRD scope (hero-only
  particle field) at your direction, into a particle system used throughout
  the page:
  - `components/motion/ParticleField.tsx` — the original full-bleed hero
    background, idle-drifting starfield.
  - `components/motion/SectionParticles.tsx` + `SectionSplit.tsx` — every
    section below the hero is now a 2:1 grid (content : particle space),
    alternating which side the particle column sits on per section. The
    particles converge into an abstract, original mark (never a real logo —
    see `lib/particle-shapes.ts`: an avatar mark for About, the node-graph
    for Architecture, a document mark for Case Studies, a bar-chart mark for
    Stack, a timeline mark for Experience, an envelope mark for Contact)
    when the section is centered in the viewport, and scatter back to idle
    drift as it moves away — one continuous distance-based value handles
    both "converge mid-section" and "scatter between sections" without
    separate triggers.
  - Sections were given real scroll room (`min-h-[140vh]`/`160vh` on the
    inner content wrapper) specifically so this converge/scatter cycle has
    room to actually read as a cycle instead of flashing past.
  - **Two real bugs caught by screenshotting actual scroll positions, not
    just reading the code:**
    1. Particle color was hardcoded light — invisible on light sections.
       Fixed: `SectionParticles` takes the section's `theme` and flips
       between light/dark particle color to match.
    2. The hero's shape-resolve progress was originally scaled to the
       hero's *entire* scroll-out distance, meaning "fully resolved" only
       ever occurred after the hero (and its canvas) had already scrolled
       completely off-screen — nobody could ever actually see the finished
       shape. Fixed by resolving within the first ~35% of the hero's
       scroll-out instead, confirmed via a 4-step scroll screenshot
       sequence that the shape is now fully formed while still clearly
       on-screen.
  - Both the hero field and the per-section instances share the same kill
    switch, `NEXT_PUBLIC_ENABLE_PARTICLES` (PRD Section 12) — flip it off
    and every particle canvas on the page disappears at once, no code
    changes.
  - Mobile layout (columns stack, content always first even on `reverse`
    sections) and desktop column-order alternation were both verified via
    Puppeteer DOM inspection (actual computed grid/bounding-rect values),
    not just visual spot-checking.
  - First Load JS: still ~196KB — the whole particle system is plain Canvas
    2D with zero new dependencies, so this added almost nothing to the
    budget.

## Not done yet (see docs/portfolio-prd-v1.md Section 2 for the phase plan)

- **Phase 4** — Three.js/R3F 3D architecture visualizer, live GitHub metrics
  (needs a fine-grained PAT — see `.env.example`).

## Worth checking yourself

- **The iOS Safari pin risk called out in the PRD (Section 7.1) is real and
  I can't test it from here** — I don't have a way to open a real iOS Safari
  session on this machine. Please load the dev site on an actual iPhone (not
  just desktop responsive mode), specifically scrolling through a couple of
  section transitions, and flag if the pin desyncs from the dynamic toolbar
  resize.
- Toggle "reduce motion" in your OS accessibility settings and reload — you
  should see sections just fade in with no pin/flip, no magnetic pull, and
  particles render as a single static resolved-shape frame with no
  animation loop.
- The particle shapes (`lib/particle-shapes.ts`) are original abstract marks
  built from circles/arcs/lines, not real logos — take a look and tell me if
  any read as too generic or if you'd rather swap one for something more
  specific to that section.

## Before this goes live

- [x] Résumé added at `public/Nyazul_Ansari_Resume.pdf`, linked from Nav/Footer
- [ ] Wire an actual email provider in `app/api/contact/route.ts` (currently
      validates and logs only — see the TODO in that file)
- [ ] Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SITE_URL`
      once DNS is pointed (duckdns default is already wired in `lib/site-config.ts`)
- [ ] Point `nyazulansari.duckdns.org`'s CNAME at Vercel and add it as a
      custom domain in the Vercel project settings

## Development

```bash
npm install
npm run dev
```

Requires Node 18.18+ (built and tested on Node 22).

### Two machine-specific gotchas already fixed, worth knowing about

- **This machine has `NODE_ENV=production` set globally in the shell.**
  `npm install` silently skips devDependencies under that env var (it did the
  first time here - `next`, `react` installed, but `@tailwindcss/postcss`,
  `typescript`, `eslint` etc. did not, with no error). If a future `npm install`
  looks like it only added a handful of packages, that's why - run
  `NODE_ENV=development npm install` explicitly. `next dev` had the same
  problem in a worse way: Next.js won't override an already-set `NODE_ENV`,
  so `next dev` was trying to read `.next/required-server-files.json` (a
  production-only build artifact) and failing. Fixed by hardcoding
  `NODE_ENV=development`/`production` directly into the `dev`/`build`/`start`
  scripts in `package.json`, so the scripts are correct regardless of the
  shell's ambient environment.
- **`next@15.4.1` (the version originally scaffolded) has a critical RCE**
  (CVE-2025-66478) plus a couple of follow-up DoS/cache-poisoning CVEs fixed
  in later December 2025 patches. Pinned to `15.5.20`, which resolves all of
  them per `npm audit`. One moderate transitive `postcss` advisory remains
  nested inside `next`'s own dependency tree with no upstream fix yet
  forcing it would mean downgrading Next to version 9 - not worth it for a
  static-content site with no user-supplied CSS. Worth re-checking
  `npm audit` occasionally in case Next ships a real fix.

