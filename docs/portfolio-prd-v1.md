# Nyazul Ansari — Portfolio: PRD & Build Spec (v2)

**Owner:** Nyazul Ansari
**Purpose of this doc:** Single source of truth for opencode + opendesign mcp to build from. Contains IA, design tokens, motion architecture, data schemas, and drafted content.
**Scope decision:** Phased build — see Section 2. Bundling the 3D visualizer, particle system, and GSAP transitions into one pass was too much single-pass risk; they're now split across phases so the site is always in a deployable state.

**Changelog (rev 2):**
- 3D visualizer restyled to a generic isometric infra diagram (API Layer / Queue / Cache / App Server / Database / Storage / Workers / Monitoring — matching the reference image), not your actual internal module names or event types — see Section 6.3 / 7.3.
- Case-study copy de-detailed: no internal class/interface/enum names, no specific event names — reframed around problem → approach → impact — see Section 6.4.
- Hosting confirmed: Vercel.
- 3D node click → routes to full case-study page: confirmed.
- Stack/Metrics section now pulls live GitHub data server-side, with a cached fallback — see Sections 6.5 and 9.4.
- Full scope split into four phases — see Section 2.

---

## 1. Audience & Positioning

Primary reader: engineers and hiring managers at product companies (the kind of orgs already in your job-search shortlist — Nium, Upstox, Nasdaq, RELX-tier). Secondary reader: recruiters doing a 60-second scan.

**Positioning principle:** the motion/3D layer is the *frame*, not the *content*. Every flashy interaction sits on top of substantive engineering writing — architecture decisions, concurrency bugs, trade-offs. If a recruiter turns off JS or disables motion, the site must still read as a strong backend-engineer portfolio, not a broken shell.

The 3D visualizer is now intentionally **generic** rather than a literal rendering of your internal system (see Section 6.3) — it represents "how I think about systems" as a class of architecture, and each node routes into a case study that goes into real depth without exposing internal identifiers.

---

## 2. Build Phases

Ordered by dependency and risk — each phase should be a working, deployable site on its own, not a broken intermediate state.

**Phase 1 — Content & design system (highest value, lowest risk)**
- IA, design tokens, static layout for all sections (Sections 5, 6 minus the 3D/particle pieces)
- Case-study routes (`/work/[slug]`) live and content-complete — this unblocks Phase 4's node-click routing later
- Experience timeline, contact form with spam protection
- No motion beyond basic CSS transitions/fade-ins
- **Ship criterion:** a recruiter with JS disabled or on a slow connection gets the full substantive pitch

**Phase 2 — Motion polish**
- GSAP section-flip transitions (Section 7.1)
- Motion micro-interactions incl. `MagneticHover` (Section 7.4)
- `prefers-reduced-motion` fallbacks (Section 7.5) implemented alongside, not after

**Phase 3 — Particle system**
- Canvas particle field in hero + scroll-linked shape resolution (Section 7.2)
- Isolated from Phases 2 and 4 — can be built and tested independently, then dropped into the hero

**Phase 4 — 3D architecture visualizer + live GitHub metrics**
- The two riskiest/most isolated engineering pieces, done last on purpose: both are additive (they enhance existing sections rather than restructure them), so a delay here never blocks a deployable site
- 3D visualizer (Section 6.3 / 7.3) with static-SVG fallback required before this is considered "done," not after
- Live GitHub data (Section 6.5 / 9.4) with cached-fallback required before this is considered "done"

---

## 3. Design Principles

- Strict black/white/gray. No accent color except a single hairline-thin "signal" tone used sparingly (status dots, active nav state, chart highlight) — keep it monochrome-adjacent (e.g. a single warm white vs pure white, not a saturated brand color).
- Typography does the work of hierarchy, not color.
- Generous negative space; dense engineering content earns visual room to breathe (contrast with your work: multi-tenant systems are dense, the *site* should not be).
- Motion has a purpose per instance: orient (section transitions), delight (hover), or explain (3D diagram interaction). No motion "because we can."
- Content-first fallback: strip away every animation and the page must still be a coherent, readable, fast case-study site.
- **3D visualizer (confirmed):** monochrome blocks — white/graphite material, single `signal` accent on connectors/active states, no pastel caps. The soft-clay material language (rounded edges, matte texture) is kept; the reference image's multi-color scheme is not.

---

## 4. Design Tokens

```json
{
  "color": {
    "bg": "#0A0A0A",
    "bg-elevated": "#121212",
    "surface": "#1A1A1A",
    "border": "#2A2A2A",
    "text-primary": "#F5F5F5",
    "text-secondary": "#A3A3A3",
    "text-tertiary": "#6B6B6B",
    "signal": "#E5E5E5",
    "signal-dim": "#8A8A8A",
    "inverse-bg": "#F5F5F5",
    "inverse-text": "#0A0A0A"
  },
  "type": {
    "font-display": "\"Neue Montreal\", \"Inter\", sans-serif",
    "font-mono": "\"JetBrains Mono\", monospace",
    "scale": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.25rem",
      "xl": "1.75rem",
      "2xl": "2.5rem",
      "3xl": "3.5rem",
      "4xl": "5rem"
    },
    "tracking-tight": "-0.02em",
    "leading-tight": "1.1",
    "leading-normal": "1.6"
  },
  "space": {
    "unit": "8px",
    "section-padding-desktop": "160px",
    "section-padding-mobile": "64px",
    "grid-gap": "24px"
  },
  "motion": {
    "duration-fast": "0.2s",
    "duration-base": "0.4s",
    "duration-slow": "0.8s",
    "duration-section-flip": "1.2s",
    "ease-standard": "cubic-bezier(0.65, 0, 0.35, 1)",
    "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  "radius": {
    "sm": "4px",
    "md": "8px",
    "none": "0px"
  }
}
```

Notes:
- Prefer `0px`/hairline-radius aesthetic (sharp, technical) for the flat UI vs. the deliberately soft-clay 3D visualizer (Section 3) — the contrast is intentional, not an inconsistency.
- `signal` color is intentionally desaturated — resist the urge to add a brand accent later; it dilutes the black/white concept.

---

## 5. Sitemap

Single-page scroll experience (matches the trionn/pinned-section reference), with deep-linkable anchors per section for sharing:

1. **Hero** — noth.in-style hover interaction
2. **About / Summary**
3. **Architecture Visualizer** — 3D interactive system diagram
4. **Case Studies** — billing concurrency, module-boundary fix, agent-code review, S3 document lifecycle
5. **Stack & Metrics** — bklit-style components, live GitHub data
6. **Experience Timeline**
7. **Contact / Footer**

Each top-level section = one "flip panel" in the GSAP-driven transition system (Section 7.1), added in Phase 2.

---

## 6. Section-by-Section Spec

### 6.1 Hero
- Full-viewport. Name + role line + one-sentence positioning statement.
- Particle field as background (Phase 3, Section 7.2), idle animation until first scroll.
- Hover interaction inspired by noth.in: primary heading text or nav items react to cursor proximity (magnetic pull / weight-shift on hover, not just color change). Build as a reusable `MagneticHover` component (Phase 2) — reused in nav and CTA buttons.
- CTA: "View architecture" (scrolls to visualizer) + "Read case studies."

**Draft copy:**
> Nyazul Ansari
> Backend Engineer — Java / Spring Boot
> I build multi-tenant systems that hold up under concurrency, not just under a demo.

### 6.2 About / Summary
> I'm a Java engineer at YSM Infosolution, finishing an M.Sc. in Computer Science at SPPU. Most of my time goes into a multi-tenant workspace platform with its own billing engine, permission system, and automation layer — built on a modular Spring Boot architecture with Kafka as the backbone between domains.
>
> I care less about frameworks and more about what breaks under load: lost updates in billing, silent constraint violations in activity logs, non-deterministic query ordering that looks fine in dev and flakes in production. Most of the case studies below are about finding and fixing exactly that class of problem.

### 6.3 Architecture Visualizer (3D) — Phase 4
Built on **Three.js** (via React Three Fiber — see 7.3; R3F is a React renderer for Three.js, not a separate engine). Confirmed: yes, three.js.

The reference image's exact grid-of-blocks layout isn't required — same node set and monochrome material language (Section 3), but a different composition is likely a better default: a **central "App Server" core with satellite nodes on orbiting arcs**, connected by curved lines rather than right-angle pipes. Reasons to prefer this over a literal block copy:
- Fewer distinct meshes to model/light well — a sphere/rounded-icosahedron core plus simpler satellite forms is quicker to get looking polished than eight separately-detailed blocks with pipe-joint hardware.
- Reads less like a stock "cute isometric illustration" and more like an actual system diagram, which fits the backend-engineer positioning (Section 1) better.
- Node labels rendered via drei's `<Html>` overlay (real DOM text positioned in 3D space) rather than baked 3D text geometry — sharper at any zoom level, no extra font-loading-in-WebGL complexity, and it's real accessible text instead of a canvas/mesh.

Keep this as the default; if the literal reference-image composition still appeals after seeing this alternative, it's a straightforward swap since both are driven by the same `architecture-scene.json` (Section 9.1) — the node/edge data doesn't change, only how it's laid out and rendered.

**Nodes (fixed set):**
`API Layer`, `App Server` (central), `Queue`, `Cache`, `Database`, `Storage`, `Workers`, `Monitoring`

Each node maps loosely to a category of real work you've done, described generically — no internal names:
- **API Layer** — REST endpoint design, request validation, typed error responses
- **App Server** — core application logic, multi-tenant request handling
- **Queue** — event-driven processing, retry logic, decoupling slow work from the request path
- **Cache** — reducing read load on hot paths, cache invalidation strategy
- **Database** — schema design, concurrency-safe writes, query performance
- **Storage** — file/object storage lifecycle management
- **Workers** — background/scheduled processing
- **Monitoring** — audit logging, observability

**Interaction model:**
- Default state: slow idle rotation, camera locked to a pleasant default angle.
- Hover a node: highlights its direct connectors, dims everything else, shows a tooltip with the one-line generic description above.
- Click a node: camera dollies toward it, then routes to the matching `/work/[slug]` case-study page (confirmed) — e.g. clicking `Queue` routes to the module-boundary/event-driven case study.
- Connector "pulses" travel along edges on hover/idle to suggest data flow, matching the reference image's joint/pipe visual language.

**Fallback (mandatory):** static isometric SVG/PNG version of the same diagram with the same hover-tooltip and click-through behavior via plain DOM/CSS — shown when WebGL unavailable, `prefers-reduced-motion` is set, or viewport < tablet width.

### 6.4 Case Studies — Phase 1 (content), routed from 6.3 in Phase 4
De-detailed: technology and stack names stay (expected on a portfolio), but internal class/interface/enum/event names are generalized.

**A — Concurrency-safe subscription billing**
> Building a multi-tenant billing engine meant confronting a real race condition: two concurrent requests could both read the same usage quota before either wrote back, letting both through even when only one should've been allowed. I moved usage tracking to a single atomic database update guarded by the remaining-quota condition, so the database enforces the invariant instead of application code racing against itself. Plan changes are versioned as snapshots taken at renewal, so switching plans mid-period never retroactively corrupts what a workspace already consumed. Quota, policy, and resource-lock violations return distinct, typed error responses instead of a generic failure, so clients can branch on what actually went wrong.

**B — Breaking circular module dependencies**
> As the backend grew, an automated architecture test started flagging circular dependencies between domains that worked fine at runtime but broke the core promise of the system — that domains talk to each other through events, not direct calls. I traced the tightest cycle to a synchronous cleanup step and moved it into an event listener that only runs after the triggering transaction commits, turning a two-way dependency into a one-way one. A couple of deeper cycles needed a stronger fix: introducing interfaces that let an upstream domain define a contract for something it needs, without ever depending on the domain that provides it. Along the way, I found the system was silently duplicating audit log entries because an event was being published to the message broker even though something in the same process already handled it.

**C — Reviewing agent-generated code before it reached users**
> An AI coding agent implemented a feature merging two related but different task types into one system. Reviewing it line-by-line against the actual permission and visibility rules surfaced 17 defects before release — a missing configuration value that broke every endpoint for the new feature, a visibility check that could leak a task to the wrong user, notifications routed to the wrong recipient, and an N+1 query hiding in a background job. None of these would have shown up in a demo; they only show up when you read generated code as carefully as you'd read your own.

**D — Document storage lifecycle for a multi-tenant CRM**
> Built file upload, download, and secure temporary-link generation for a property management CRM, plus lifecycle management scoped to each project — so deleting a project actually cleans up its stored files instead of leaving orphaned data billed indefinitely. Paired with a configurable report engine so different user roles see a different set of fields in generated documents, without needing a separate template per role.

Each card: title, 2–3 sentence excerpt (above), stack tags, link into a dedicated `/work/[slug]` route (SEO-indexable, unlike a modal).

### 6.5 Stack & Metrics (bklit-style) — live GitHub data, Phase 4
Use `bklit-ui` components directly rather than rebuilding chart primitives.

- Live-fetched: public repo count, top languages by byte share across repos, contribution calendar.
- Self-assessed (static, labeled as such): a stack proficiency chart (Java/Spring, PostgreSQL, Kafka, React, Docker) — don't dress this up as "live" data, it isn't.
- See Section 9.4 for the fetch/cache/fallback architecture — this section must never render a broken or empty state if GitHub's API is unavailable or rate-limited.

### 6.6 Experience Timeline
Straight chronological, no gimmicks needed here — this section should be the "boring reliable" one. Software Engineering Intern → Java Software Engineer, with the top 2–3 bullets per role pulled from the resume.

### 6.7 Contact / Footer
Email, GitHub, LinkedIn. Lightweight contact form — **spam protection is mandatory** (honeypot field minimum, Cloudflare Turnstile — pairs naturally with Vercel hosting). Server-side validation regardless of client-side checks; never trust the client on a public form.

---

## 7. Motion & Interaction Architecture

### 7.1 Section-flip transitions (GSAP + ScrollTrigger) — Phase 2
- Each top-level section (Section 5 list) is pinned in sequence; scrolling within a pinned section drives a timeline that "flips" the outgoing section's rows/panels to reveal the next section's color-inverted rows underneath (trionn-style progressive row flip).
- Implementation: `ScrollTrigger` with `pin: true`, `scrub: true` (tie animation progress directly to scroll position — never to time — so it can't get out of sync with fast/slow scrolling).
- **iOS Safari is the known failure point** for pinned/fixed sections (dynamic toolbar resize desyncs pin calculations). Acceptance criterion: test on a real iOS device, not just desktop Chrome.
- Mobile fallback: below a defined breakpoint (recommend disabling pin below 768px), switch to a normal linear scroll with a lighter crossfade/slide transition instead of the row-flip.

### 7.2 Particle system — Phase 3
- Canvas 2D (not WebGL/shader) — sufficient for perceptible particle counts (aim for ~1,500–3,000 particles) without the mobile GPU inconsistency of a shader approach.
- Particles idle-drift in the hero background, then resolve into 2–3 shape targets keyed to scroll progress (e.g., resolve into a simplified node-graph shape as the user approaches the Architecture Visualizer section).
- Shape targets are point clouds sampled from SVG paths (Section 9.2) — precompute these, don't generate at runtime.
- Must run on `requestAnimationFrame`, position interpolated from scroll percentage (throttle the scroll listener itself, don't recompute per native scroll event).
- Cap DPR-aware pixel density (`Math.min(window.devicePixelRatio, 2)`).

### 7.3 3D Architecture Visualizer — Phase 4
- Libraries: `three`, `@react-three/fiber`, `@react-three/drei`. R3F/drei sit on top of three.js — you're not choosing between them, R3F is just the React-idiomatic way to drive a three.js scene from component state (hover/selected node) instead of imperative DOM-manipulation-style code.
- Node labels via drei's `<Html>` component (real DOM text anchored to a 3D position), not baked 3D text geometry — see 6.3 for why.
- Lazy-load the whole bundle behind an `IntersectionObserver` — never in the initial JS bundle.
- Data-driven from a static JSON scene graph (Section 9.1) — never hardcode node positions in component code.

### 7.4 Micro-interactions (Motion) — Phase 2
- `MagneticHover` (Section 6.1), button press states, card hover elevation, nav active-state transitions.
- Keep Motion scoped to component-local interactions; GSAP owns page-level scroll/section choreography. One system per concern.

### 7.5 `prefers-reduced-motion` contract (mandatory for whichever phase ships each system)
| System | Reduced-motion behavior |
|---|---|
| GSAP section flip | Disable pin/scrub; sections stack normally with a simple opacity fade-in on viewport entry |
| Particle system | Render a single static frame of the "resolved" shape state, no animation loop |
| 3D visualizer | Static SVG fallback (same as no-WebGL fallback) rather than a motion-reduced 3D scene |

---

## 8. Technical Architecture

- **Framework:** Next.js (App Router) — SSR/SEO for case-study routes, easy code-splitting for the heavier R3F/particle bundles.
- **Perf budget:** Largest Contentful Paint < 2.5s on throttled 4G for the hero (must not depend on Phase-4 bundles loading first). Total JS for initial route ≤ ~250KB gzipped before lazy chunks.
- **Accessibility baseline:** semantic HTML underneath every visual layer, keyboard-navigable nav and contact form, all motion gated by 7.5.
- **Testing scope, right-sized:** skip heavy unit-test coverage on a marketing/content site. Prioritize Lighthouse CI in the deploy pipeline (perf/accessibility/SEO gates) and manual cross-device checks (real iOS Safari, one Android device, one low-end laptop) before each deploy given the ScrollTrigger risk.
- **Hosting:** Vercel — confirmed. **Domain:** `nyazulansari.duckdns.org` for now, no domain purchased yet. DuckDNS supports adding a CNAME pointing at Vercel's edge, so this works as a real custom domain (not just Vercel's default `*.vercel.app`) — Vercel issues TLS automatically once the CNAME is verified. Swapping in a purchased domain later is a DNS change only, no app changes needed, since nothing in this spec hardcodes the domain.
- **GitHub data fetching:** server-side only (Route Handler or scheduled job), never a client-side fetch with an exposed token — see Section 9.4.
- **Analytics:** recommend a privacy-friendly, self-hostable option (OpenPanel or Plausible) over Google Analytics.

---

## 9. Data File Schemas (for opencode/opendesign to consume directly)

### 9.1 `architecture-scene.json` (drives the 3D visualizer, Section 6.3 — Phase 4)
```json
{
  "nodes": [
    {
      "id": "api-layer",
      "label": "API Layer",
      "position": [0, 2, 2],
      "description": "REST endpoint design, request validation, typed error responses",
      "caseStudySlug": "billing-concurrency"
    },
    {
      "id": "app-server",
      "label": "App Server",
      "position": [0, 0, 0],
      "description": "Core application logic, multi-tenant request handling",
      "caseStudySlug": null
    },
    {
      "id": "queue",
      "label": "Queue",
      "position": [2, 1, -1],
      "description": "Event-driven processing, retry logic, decoupling slow work from the request path",
      "caseStudySlug": "module-boundary-fix"
    },
    {
      "id": "cache",
      "label": "Cache",
      "position": [-2, 1, 1],
      "description": "Reducing read load on hot paths, cache invalidation strategy",
      "caseStudySlug": null
    },
    {
      "id": "database",
      "label": "Database",
      "position": [3, 0, -2],
      "description": "Schema design, concurrency-safe writes, query performance",
      "caseStudySlug": "billing-concurrency"
    },
    {
      "id": "storage",
      "label": "Storage",
      "position": [-3, 0, 1],
      "description": "File/object storage lifecycle management",
      "caseStudySlug": "s3-document-lifecycle"
    },
    {
      "id": "workers",
      "label": "Workers",
      "position": [-1, -1, 2],
      "description": "Background and scheduled processing",
      "caseStudySlug": "agent-code-review"
    },
    {
      "id": "monitoring",
      "label": "Monitoring",
      "position": [2, -1, 2],
      "description": "Audit logging, observability",
      "caseStudySlug": null
    }
  ],
  "edges": [
    { "from": "api-layer", "to": "app-server" },
    { "from": "app-server", "to": "queue" },
    { "from": "app-server", "to": "cache" },
    { "from": "app-server", "to": "database" },
    { "from": "app-server", "to": "storage" },
    { "from": "app-server", "to": "workers" },
    { "from": "workers", "to": "monitoring" },
    { "from": "queue", "to": "workers" }
  ]
}
```
*(Positions are placeholders matching the reference image's rough layout — refine once modeled in R3F.)*

### 9.2 Particle shape targets
```json
{
  "shapeId": "node-graph-hint",
  "sourceSvg": "assets/node-graph-outline.svg",
  "points": [[0.12, 0.44], [0.15, 0.41], "..."],
  "pointCount": 1800
}
```
Generate via a one-time script (sample an SVG path at N points) — not at runtime.

### 9.3 `design-tokens.json`
Extract directly from Section 4's JSON block into its own file at build time — single source of truth for both the Tailwind/CSS config and the R3F material colors.

### 9.4 GitHub live metrics (Section 6.5, Phase 4)
**Fetch strategy:** server-side only, via a Next.js Route Handler using an authenticated GitHub token (env var, never exposed client-side) for the 5,000/hr rate limit instead of the 60/hr unauthenticated limit. Cache with `revalidate` (e.g. hourly) or a Vercel Cron Job writing a snapshot to Vercel KV/Edge Config, so the public page never depends on GitHub's live uptime.

**Token guidance (you're generating a new one):** use a **fine-grained PAT**, read-only, scoped to public repository metadata only — this token only ever reads your own public data, so it shouldn't hold write access or private-repo scope even though it's server-side. Set an explicit expiration (fine-grained PATs require one) and treat that expiration as a real operational date: a 401 from an expired token must hit the same cached-fallback path as any other failure (Section 9.4 fallback), not a distinct unhandled error. Store only in Vercel's environment variables, never in a committed file.

**Cached snapshot shape:**
```json
{
  "fetchedAt": "2026-07-17T10:00:00Z",
  "publicRepoCount": 0,
  "topLanguages": [{ "name": "Java", "byteShare": 0.0 }],
  "contributionCalendar": [{ "date": "2026-07-01", "count": 0 }]
}
```
**Fallback (mandatory):** if the live fetch fails, render the last successfully cached snapshot with a small "as of [date]" label rather than an empty or broken state — never let a third-party API outage take down a section of your own site.

---

## 10. Risk Register

| Risk | Mitigation |
|---|---|
| Pinned scroll breaks on iOS Safari | Disable pin below tablet breakpoint; test on real device before every deploy |
| 3D bundle delays first paint | Lazy-load behind IntersectionObserver; never in initial bundle; Phase 4 (last) |
| Particle loop tanks mobile battery/frame rate | Canvas 2D not WebGL; DPR cap; reduced-motion static frame |
| Site reads as "frontend portfolio" not backend engineer | Case-study copy (6.4) carries the technical weight; generic 3D diagram is framing, not the pitch |
| Contact form spam/abuse | Honeypot + server-side validation minimum; Turnstile on Vercel |
| GitHub API rate-limited or down | Authenticated server-side fetch + cached snapshot fallback (9.4) — never a broken metrics section |
| Three animation libraries (GSAP+Motion+anime.js) bloat bundle for no capability gain | Confirmed: GSAP + Motion only, no anime.js |
| Trying to ship everything in one pass | Confirmed: split into 4 phases (Section 2), each independently deployable |

---

## 11. Open Items

1. **Case-study copy (Section 6.4)** — deferred by choice. Revisit and sign off on the four drafts before Phase 1 is considered content-complete, since that's the ship criterion for Phase 1 (Section 2).
2. **3D layout (Section 6.3)** — default is now the orbiting-satellite composition rather than the literal reference-image grid. Worth a quick look once opendesign produces a first-pass render, before locking it in for Phase 4.

Everything else from the previous round (hosting, domain, node click-routing, GitHub token sourcing, color treatment) is confirmed above.

---

## 12. Additional Suggestions

A few things worth building in now because they're cheap to add at spec time and expensive to retrofit later:

- **Feature-flag kill switch for Phase 3/4.** Gate the particle system and 3D visualizer behind a single env var each (e.g. `NEXT_PUBLIC_ENABLE_PARTICLES`, `NEXT_PUBLIC_ENABLE_3D_VIZ`). If either regresses in production — a browser update breaks something, GitHub's API changes shape — you can disable it with a redeploy of an env var, not a code rollback. Cheap insurance for exactly the two riskiest, most isolated pieces (Section 2).
- **Basic SEO scaffolding from Phase 1**, not bolted on later: `sitemap.xml` and `robots.txt` (trivial in Next.js App Router — a `sitemap.ts`/`robots.ts` file each), an Open Graph image for link previews, and JSON-LD structured data (`Person` schema on the homepage, `CreativeWork`/`Article` on each case-study route). This is what makes your case studies show up well when someone pastes the link into Slack or LinkedIn, and it's a five-minute add per route if it's part of the initial routing work rather than a retrofit.
- **Preview deployments per phase.** Vercel gives you a preview URL per branch/PR automatically — use one branch per phase (Section 2) and get sign-off on the deployed preview before merging to `main`, rather than reviewing phases only in local dev. Cross-device checks (Section 8's iOS Safari requirement) are only meaningful against a real deployed URL anyway.
- **Resume as a first-class artifact**, not an afterthought: a direct "Download résumé (PDF)" link in the nav/footer. Recruiters skimming a portfolio site often still want the PDF for their ATS/tracker — don't make them dig for it.
