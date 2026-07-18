"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

type SectionRevealProps = {
  children: React.ReactNode;
  className?: string;
  rows?: number;
};

// PRD Section 7.1: pinned, scrub-driven row-flip reveal on desktop with
// motion enabled. Mobile (<768px) and prefers-reduced-motion both fall back
// to a plain opacity fade-in - see the matchMedia branches below, this is
// not an afterthought bolted onto the desktop version.
export function SectionReveal({
  children,
  className,
  rows = 6,
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
          // before immediately animating them away on scroll.
          gsap.set(flapsRef.current, {
            autoAlpha: 1,
            rotateX: 0,
            transformPerspective: 800,
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
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) flapsRef.current.push(el);
            }}
            // invisible by default: only the desktop-motion matchMedia branch
            // ever makes these opaque, and only for the instant before it
            // starts animating them away. No-JS/reduced-motion/mobile users
            // never see a cover at all.
            className="invisible border-b border-border bg-bg [backface-visibility:hidden]"
            style={{ height: `${100 / rows}%`, transformOrigin: "top" }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
