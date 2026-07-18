"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { themeColors, themeStyle, type SectionTheme } from "@/lib/theme-colors";

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
};

// PRD Section 7.1: pinned, scrub-driven row-flip reveal on desktop with
// motion enabled. Mobile (<768px) and prefers-reduced-motion both fall back
// to a plain opacity fade-in - see the matchMedia branches below.
export function SectionReveal({
  children,
  className,
  rows = 6,
  theme,
  prevTheme,
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

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Full pinned row-flip: desktop + motion allowed.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(container, { autoAlpha: 1 });
          // Flaps are invisible by default (see className below) so that no-JS
          // and pre-hydration states show the real content, not a permanent
          // cover. Only here, once we know this browser will run the full
          // pinned animation, do we make them opaque and flat (covering)
          // before immediately animating them away on scroll. Perspective
          // now lives once on the shared parent (see the wrapping div below)
          // rather than per-flap, so all rows share one vanishing point
          // instead of each bulging independently.
          gsap.set(flapsRef.current, {
            autoAlpha: 1,
            rotateX: 0,
          });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: container,
              start: "top 80%",
              end: "top 20%",
              scrub: 0.5,
            },
          });

          tl.to(flapsRef.current, {
            rotateX: -100,
            stagger: 0.06,
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

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      // bg-bg here is the fix for the real bug the video surfaced: the CSS
      // var overrides from themeStyle() were being set correctly, but
      // nothing was ever painting them - only <body> (always the root/dark
      // value) was visibly the page background. This class is what actually
      // makes each section's local override paint as its own canvas.
      className={`relative bg-bg ${className ?? ""}`}
      style={themeStyle(theme)}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 flex flex-col"
        style={{ perspective: "1000px" }}
      >
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
            // flip read as a transition rather than a same-color flash.
            className="invisible [backface-visibility:hidden]"
            style={{
              height: `${100 / rows}%`,
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
