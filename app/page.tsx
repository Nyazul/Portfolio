import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ArchitectureSection } from "@/components/ArchitectureSection";
import { CaseStudies } from "@/components/CaseStudies";
import { ProjectsSection } from "@/components/ProjectsSection";
import { StackMetrics } from "@/components/StackMetrics";
import { Principles } from "@/components/Principles";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { Contact } from "@/components/Contact";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { ParticleSystem } from "@/components/motion/ParticleSystem";
import { EdgeTextRows } from "@/components/motion/EdgeTextRows";

// Phase 2: GSAP pinned row-flip reveal on each section below the hero
// (PRD 7.1), alternating dark/light per section so the flip actually reads
// as a color transition rather than a same-color flash. Hero stays dark
// and unwrapped - it's the first thing visible on load, nothing to
// transition FROM above it. Each section component's own SectionSplit
// `theme` must match the `theme` given here, and its `reverse` alternates
// the same way (about: shape right, architecture: shape left, ...).
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
        {/* Same dark palette as the hero: reads as the hero's exit, so the
            first row-flip reveal (About) still transitions from dark. */}
        <EdgeTextRows />
        <SectionReveal id="about" theme="light" prevTheme="dark">
          <About />
        </SectionReveal>
        <SectionReveal id="architecture" theme="dark" prevTheme="light">
          <ArchitectureSection />
        </SectionReveal>
        <SectionReveal id="projects" theme="light" prevTheme="dark">
          <ProjectsSection />
        </SectionReveal>
        <SectionReveal id="work" theme="dark" prevTheme="light">
          <CaseStudies />
        </SectionReveal>
        <SectionReveal id="stack" theme="light" prevTheme="dark">
          <StackMetrics />
        </SectionReveal>
        <SectionReveal id="principles" theme="dark" prevTheme="light">
          <Principles />
        </SectionReveal>
        <SectionReveal id="experience" theme="light" prevTheme="dark">
          <ExperienceTimeline />
        </SectionReveal>
        <SectionReveal id="contact" theme="dark" prevTheme="light">
          <Contact />
        </SectionReveal>
      </main>
    </>
  );
}
