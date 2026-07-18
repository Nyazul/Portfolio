# Nyazul Ansari — Portfolio

Spec: [docs/portfolio-prd-v1.md](./docs/portfolio-prd-v1.md) — read this first,
it's the source of truth for design tokens, content, and the phased build plan.

## Status: Phase 2 complete (motion polish)

- **Phase 1** (content & design system): all sections, `/work/[slug]` routes,
  contact form with honeypot + validation, sitemap/robots/OG/JSON-LD.
- **Phase 2** (this round): GSAP `ScrollTrigger` pinned row-flip reveal on
  every section below the hero (`components/motion/SectionReveal.tsx`), and
  a reusable magnetic-pull hover on nav links and hero CTAs
  (`components/motion/MagneticHover.tsx`, built on `motion`).
  - **Sections alternate dark/light** (`lib/theme-colors.ts`) so the row-flip
    actually reads as a color transition instead of a same-color flash — the
    original version colored flaps to match their own section's background,
    which just looked like thin lines appearing. Fixed: each section's flaps
    are colored with the *previous* section's palette, so scrolling into a
    light section after a dark one shows dark flaps peeling away to reveal
    light content underneath. Hero stays permanently dark as the fixed
    first-viewport identity; About/Architecture/Case Studies/Stack/
    Experience/Contact alternate from there.
  - Every other component needed zero changes to support this — they already
    use semantic token classes (`bg-bg`, `text-text-primary`, `border-border`,
    etc.), which Tailwind v4 compiles to `var(--color-*)`. Overriding those
    CSS variables on `SectionReveal`'s wrapping container re-themes
    everything inside it automatically.
  - **Reduced-motion and mobile are real fallbacks, not afterthoughts:**
    `SectionReveal`'s flap overlays are `invisible` by default in the
    server-rendered HTML itself (verified by curling the page and checking
    the raw markup) — only the desktop + motion-allowed `matchMedia` branch
    ever makes them opaque before animating them away. No-JS, JS-disabled,
    `prefers-reduced-motion`, and mobile viewports all just see the section
    fade in normally or appear immediately. `MagneticHover` returns a plain
    unstyled wrapper (no transform logic at all) when reduced motion is set.
  - First Load JS on the homepage grew from ~107KB (Phase 1) to ~194KB with
    GSAP + Motion added — still comfortably under the 250KB budget in the
    PRD, but worth knowing GSAP/Motion are the biggest line items in that
    budget as more gets added in Phase 3/4.

## Not done yet (see docs/portfolio-prd-v1.md Section 2 for the phase plan)

- **Phase 3** — Canvas particle field in the hero.
- **Phase 4** — Three.js/R3F 3D architecture visualizer, live GitHub metrics
  (needs a fine-grained PAT — see `.env.example`).

## Worth checking yourself before Phase 3

- **The iOS Safari pin risk called out in the PRD (Section 7.1) is real and
  I can't test it from here** — I don't have a way to open a real iOS Safari
  session on this machine. Please load the dev site on an actual iPhone (not
  just desktop responsive mode) before this goes further, specifically
  scrolling through a couple of section transitions, and flag if the pin
  desyncs from the dynamic toolbar resize.
- Toggle "reduce motion" in your OS accessibility settings and reload — you
  should see sections just fade in with no pin/flip at all, and hero/nav
  hover should have no magnetic pull.

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

