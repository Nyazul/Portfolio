"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { themeColors, themeStyle, type SectionTheme } from "@/lib/theme-colors";
import {
  setRevealProgress,
  registerSectionFlap,
  unregisterSectionFlap,
  setRowRevealProgress,
} from "@/lib/particle-store";

let registered = false;

type SectionRevealProps = {
  children: React.ReactNode;
  className?: string;
  rows?: number;
  // This section's own palette (applied to its content via CSS var overrides).
  theme: SectionTheme;
  // The section immediately above it - the flap color, so the reveal reads
  // as a transition FROM the previous section's color INTO this one's,
  // not just this section flashing its own (matching) color at itself.
  prevTheme: SectionTheme;
  // Matches the id passed to this section's own useParticleTarget call (see
  // SectionSplit) - lets this component report its flap-reveal progress so
  // <ParticleSystem/> can blend particle color in step with the actual
  // visible background instead of switching the instant this section wins
  // geometric dominance. Optional: sections with no matching particle
  // target (there are none today, but keep this from being load-bearing)
  // simply skip reporting.
  id?: string;
};

// PRD Section 7.1: pinned, scrub-driven row reveal on desktop with motion
// allowed. Mobile (<768px) and prefers-reduced-motion both fall back to a
// plain opacity fade-in - see the matchMedia branches below.
//
// This is a flat scaleY collapse (transform-origin: top), not a 3D rotateX
// flip. An earlier version used rotateX + perspective, which is correct 3D
// projection but produces exactly what you'd expect from rotating a flat
// plane away from the viewer: the far (bottom) edge foreshortens, giving a
// trapezoid instead of a rectangle, plus rotation-overshoot glitches near
// the perspective's vanishing point. scaleY has none of that - the rows
// just minimize, full width preserved top to bottom.
export function SectionReveal({
  children,
  className,
  rows = 20,
  theme,
  prevTheme,
  id,
}: SectionRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flapsRef = useRef<HTMLDivElement[]>([]);
  flapsRef.current = [];

  useLayoutEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    const container = containerRef.current;
    if (!container) return;

    // Registered unconditionally (both matchMedia branches below run inside
    // the same mount) so <ParticleSystem/> always has a live container rect
    // and row count to bank on, regardless of which branch actually drives
    // the flaps.
    if (id) {
      registerSectionFlap({ id, el: container, rows, theme, prevTheme });
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Full pinned row reveal: desktop + motion allowed.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(container, { autoAlpha: 1 });
          // Flaps are invisible by default (see className below) so that no-JS
          // and pre-hydration states show the real content, not a permanent
          // cover. Only here, once we know this browser will run the full
          // pinned animation, do we make them opaque and full-height before
          // immediately animating them away on scroll.
          gsap.set(flapsRef.current, {
            autoAlpha: 1,
            scaleY: 1,
          });
          // Flaps start fully covering - this section's real background
          // isn't visible yet, so the particle field shouldn't be treating
          // it as revealed either.
          if (id) {
            setRevealProgress(id, 0);
            setRowRevealProgress(id, flapsRef.current.map(() => 0));
          }

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: container,
              start: "top 70%",
              end: "top 0%",
              scrub: 0.5,
              // self.progress is a single scalar for the WHOLE staggered
              // timeline, so on its own it can only describe an average
              // reveal state - some rows may already be fully open while
              // others haven't started. Reading each row's own live scaleY
              // instead (rather than re-deriving per-row timing from the
              // stagger/duration constants) is exact regardless of easing,
              // and is what lets <ParticleSystem/> color each particle by
              // the row actually behind it instead of a canvas-wide guess.
              onUpdate: (self) => {
                if (!id) return;
                setRevealProgress(id, self.progress);
                setRowRevealProgress(
                  id,
                  flapsRef.current.map((el) => 1 - (gsap.getProperty(el, "scaleY") as number)),
                );
              },
            },
          });

          tl.to(flapsRef.current, {
            scaleY: 0,
            stagger: 0.14,
            ease: "none",
          });

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        },
      );

      // Fallback: reduced motion OR mobile - simple fade on enter, no pin,
      // no flaps (flaps are hidden entirely, not just left static-open).
      mm.add(
        "(max-width: 767px), (prefers-reduced-motion: reduce)",
        () => {
          gsap.set(flapsRef.current, { autoAlpha: 0 });
          // No flap ever covers this section on this branch, so its real
          // background is always the visible one - report fully revealed.
          if (id) {
            setRevealProgress(id, 1);
            setRowRevealProgress(id, flapsRef.current.map(() => 1));
          }
          gsap.fromTo(
            container,
            { autoAlpha: 0, y: 16 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: {
                trigger: container,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            },
          );
        },
      );

      return () => mm.revert();
    }, container);

    return () => {
      ctx.revert();
      if (id) unregisterSectionFlap(id);
    };
    // Re-register if the section's identity or theming changes (they don't at
    // runtime today, but they're read inside the effect so they belong in the
    // dep array rather than being silently ignored).
  }, [id, theme, prevTheme, rows]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-bg ${className ?? ""}`}
      style={themeStyle(theme)}
    >
      <div className="pointer-events-none absolute inset-0 z-10">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) flapsRef.current.push(el);
            }}
            // invisible by default: only the desktop-motion matchMedia branch
            // ever makes these opaque, and only for the instant before it
            // starts animating them away. No-JS/reduced-motion/mobile users
            // never see a cover at all. Background is the PREVIOUS section's
            // color (not this section's own bg-bg) - that's what makes the
            // reveal read as a transition rather than a same-color flash.
            //
            // Absolutely positioned with a deliberate 1px overlap top and
            // bottom (rather than flex-distributed tiles) - adjacent rows
            // with independent CSS transforms can expose a subpixel seam
            // between them even when their untransformed geometry tiles
            // perfectly, letting the section's own (differently-colored)
            // bg-bg peek through as a thin line. The overlap guarantees
            // there's never a gap for that to happen through.
            className="invisible absolute inset-x-0 [backface-visibility:hidden]"
            style={{
              top: `calc(${(i / rows) * 100}% - 1px)`,
              height: `calc(${100 / rows}% + 2px)`,
              transformOrigin: "top",
              backgroundColor: themeColors[prevTheme].bg,
            }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
