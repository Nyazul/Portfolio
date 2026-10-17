"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { siteConfig } from "@/lib/site-config";
import { MagneticHover } from "@/components/motion/MagneticHover";
import { InvertBlobHover } from "@/components/motion/InvertBlobHover";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";
import { HeroRequestLog } from "@/components/HeroRequestLog";
import { useParticleTarget } from "@/lib/hooks/use-particle-target";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useDeviceTier } from "@/lib/device-tier";

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
//
// Kept short on purpose: the whole intro (name, role, tagline) lands in
// about a second. A slower reveal looked luxurious but left the page
// reading as unresponsive for several seconds on first load.
const REVEAL_STAGGER = 0.045;
const REVEAL_DURATION = 1.1;

const MARQUEE_ITEMS = [
  "Java",
  "Spring Boot",
  "Apache Kafka",
  "PostgreSQL",
  "Spring Modulith",
  "Multi-tenancy",
  "Event-driven",
  "Concurrency",
  "AWS S3",
  "Docker",
];

export function Hero() {
  const targetRef = useParticleTarget("top", "dark", null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const tier = useDeviceTier();
  const nameChars = siteConfig.name.split("");
  const introDelay = nameChars.length * REVEAL_STAGGER;

  // Scroll-out: as the hero leaves the viewport its content recedes (scale,
  // fade, slight blur) instead of just sliding off. Driven by scroll
  // position, so it reverses exactly when scrolling back up. The blur is
  // high-tier only: re-filtering the 11rem name on every scroll frame was
  // one of the costliest paints on the page, and scale + fade alone still
  // reads as receding.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 1], ["blur(0px)", "blur(6px)"]);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="section-pad relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-6"
    >
      <div ref={targetRef} className="absolute inset-0 z-0" aria-hidden="true" />
      <motion.div
        className="relative z-[6] mx-auto w-full max-w-6xl origin-top-left"
        style={
          prefersReducedMotion
            ? undefined
            : tier === "high"
              ? { scale, opacity, filter: blur }
              : { scale, opacity }
        }
      >
        <motion.p
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-border px-3.5 py-1.5 font-mono text-xs text-text-secondary"
          initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="status-ping absolute inline-flex h-full w-full rounded-full bg-accent" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {siteConfig.availability}
        </motion.p>
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
            delay: introDelay + 0.2,
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
            delay: introDelay + 0.35,
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
          <motion.a
            href="#about"
            className="ml-auto hidden items-center gap-3 self-center font-mono text-xs text-text-tertiary transition-colors hover:text-text-primary md:flex"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: introDelay + 0.6 }}
          >
            Scroll
            <span className="relative block h-8 w-px overflow-hidden bg-border">
              <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-accent" />
            </span>
          </motion.a>
        </div>
        <HeroRequestLog delay={introDelay + 0.8} />
      </motion.div>
      <VelocityMarquee
        items={MARQUEE_ITEMS}
        className="absolute inset-x-0 bottom-6 z-[6] border-y border-border py-4 font-mono text-sm text-text-tertiary md:bottom-10"
      />
    </section>
  );
}
