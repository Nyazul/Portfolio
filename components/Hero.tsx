"use client";

import { motion } from "motion/react";
import { siteConfig } from "@/lib/site-config";
import { MagneticHover } from "@/components/motion/MagneticHover";
import { InvertBlobHover } from "@/components/motion/InvertBlobHover";
import { useParticleTarget } from "@/lib/hooks/use-particle-target";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// Hero itself isn't wrapped in SectionReveal (PRD 7.1) - it's the first
// thing visible on load, there's no scroll position to reveal it from.
//
// Registered with shapePoints: null - per the brief, the first section
// keeps particles scattered rather than converging into a shape; sections
// after this one are the first to actually form something.
//
// Name treatment is a masked, per-character reveal (each letter clipped by
// an overflow-hidden wrapper, sliding up into place on mount) - the same
// opening-statement move noth.in uses for its big hero line. Kept as plain
// CSS-driven motion values rather than gsap/ScrollTrigger since this runs
// once on load, not on scroll.
const REVEAL_STAGGER = 0.2;
const REVEAL_DURATION = 2.9;

export function Hero() {
  const targetRef = useParticleTarget("top", "dark", null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const nameChars = siteConfig.name.split("");

  return (
    <section
      id="top"
      className="section-pad relative flex min-h-[90vh] flex-col justify-center overflow-hidden px-6"
    >
      <div ref={targetRef} className="absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-[6] mx-auto w-full max-w-6xl">
        <MagneticHover strength={6} className="inline-block">
          <InvertBlobHover>
            <h1 className="flex flex-nowrap whitespace-nowrap text-[clamp(3rem,12vw,11rem)] leading-[0.95] font-medium tracking-tight text-text-primary">
              {nameChars.map((char, i) => (
                <span
                  key={`${char}-${i}`}
                  className="overflow-hidden pb-1"
                >
                  <motion.span
                    className="inline-block"
                    initial={prefersReducedMotion ? false : { y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{
                      duration: REVEAL_DURATION,
                      delay: i * REVEAL_STAGGER,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                </span>
              ))}
            </h1>
          </InvertBlobHover>
        </MagneticHover>
        <motion.p
          className="mt-5 font-mono text-sm text-text-tertiary md:text-base"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: nameChars.length * REVEAL_STAGGER + 0.2,
            ease: "easeOut",
          }}
        >
          {siteConfig.role}
        </motion.p>
        <motion.p
          className="mt-6 max-w-xl text-lg text-text-secondary"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: nameChars.length * REVEAL_STAGGER + 0.35,
            ease: "easeOut",
          }}
        >
          {siteConfig.tagline}
        </motion.p>
        <div className="mt-10 flex flex-wrap gap-4">
          <MagneticHover strength={12}>
            <a
              href="#architecture"
              className="block border border-text-primary px-6 py-3 text-sm text-text-primary transition-colors duration-200 hover:bg-text-primary hover:text-inverse-text"
            >
              View architecture
            </a>
          </MagneticHover>
          <MagneticHover strength={12}>
            <a
              href="#work"
              className="block border border-border px-6 py-3 text-sm text-text-secondary transition-colors duration-200 hover:border-text-primary hover:text-text-primary"
            >
              Read case studies
            </a>
          </MagneticHover>
        </div>
      </div>
    </section>
  );
}
