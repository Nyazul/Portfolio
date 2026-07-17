# Nyazul Ansari — Portfolio

Spec: [docs/portfolio-prd-v1.md](./docs/portfolio-prd-v1.md) — read this first,
it's the source of truth for design tokens, content, and the phased build plan.

## Status: Phase 1 complete (content & design system)

- All sections built as static, motion-free content: Hero, About,
  Architecture (static grid, doubles as the mandatory 3D fallback),
  Case Studies (with dedicated `/work/[slug]` routes), Stack (self-assessed,
  live GitHub data deferred), Experience, Contact (with honeypot + server-side
  validation).
- Deliberately no GSAP, no Motion, no particles, no 3D yet. Per the PRD's ship
  criterion: this should be a complete, readable site even with all animation
  absent.
- SEO basics done now, not deferred: sitemap.ts, robots.ts, dynamic OG image,
  Person/Article JSON-LD.

## Not done yet (see docs/portfolio-prd-v1.md Section 2 for the phase plan)

- **Phase 2** — GSAP ScrollTrigger section-flip transitions, Motion
  micro-interactions (`MagneticHover`), `prefers-reduced-motion` fallbacks.
- **Phase 3** — Canvas particle field in the hero.
- **Phase 4** — Three.js/R3F 3D architecture visualizer, live GitHub metrics
  (needs a fine-grained PAT — see `.env.example`).

## Before this goes live

- [ ] Add `public/resume.pdf` (linked from Nav and Footer, file not present yet)
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

