import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ArchitectureSection } from "@/components/ArchitectureSection";
import { CaseStudies } from "@/components/CaseStudies";
import { StackMetrics } from "@/components/StackMetrics";
import { Principles } from "@/components/Principles";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { Contact } from "@/components/Contact";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { ParticleSystem } from "@/components/motion/ParticleSystem";

// Phase 2: GSAP pinned row-flip reveal on each section below the hero
// (PRD 7.1), alternating dark/light per section so the flip actually reads
// as a color transition rather than a same-color flash. Hero stays dark
// and unwrapped - it's the first thing visible on load, nothing to
// transition FROM above it. Each section component's own SectionSplit
// `theme` must match the `theme` given here.
//
// Particles live here rather than in the root layout: they converge into
// the home sections' shapes, and on text-heavy routes (/work/*, 404) with
// no targets they'd just scatter across the copy.
export default function Home() {
  return (
    <>
      <ParticleSystem />
      <main id="main">
        <Hero />
        <SectionReveal id="about" theme="light" prevTheme="dark">
          <About />
        </SectionReveal>
        <SectionReveal id="architecture" theme="dark" prevTheme="light">
          <ArchitectureSection />
        </SectionReveal>
        <SectionReveal id="work" theme="light" prevTheme="dark">
          <CaseStudies />
        </SectionReveal>
        <SectionReveal id="stack" theme="dark" prevTheme="light">
          <StackMetrics />
        </SectionReveal>
        <SectionReveal id="principles" theme="light" prevTheme="dark">
          <Principles />
        </SectionReveal>
        <SectionReveal id="experience" theme="dark" prevTheme="light">
          <ExperienceTimeline />
        </SectionReveal>
        <SectionReveal id="contact" theme="light" prevTheme="dark">
          <Contact />
        </SectionReveal>
      </main>
    </>
  );
}
