import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ArchitectureSection } from "@/components/ArchitectureSection";
import { CaseStudies } from "@/components/CaseStudies";
import { StackMetrics } from "@/components/StackMetrics";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { Contact } from "@/components/Contact";
import { SectionReveal } from "@/components/motion/SectionReveal";

// Phase 2: GSAP pinned row-flip reveal on each section below the hero
// (PRD 7.1), alternating dark/light per section so the flip actually reads
// as a color transition rather than a same-color flash. Hero stays dark
// and unwrapped - it's the first thing visible on load, nothing to
// transition FROM above it.
export default function Home() {
  return (
    <main>
      <Hero />
      <SectionReveal theme="light" prevTheme="dark">
        <About />
      </SectionReveal>
      <SectionReveal theme="dark" prevTheme="light">
        <ArchitectureSection />
      </SectionReveal>
      <SectionReveal theme="light" prevTheme="dark">
        <CaseStudies />
      </SectionReveal>
      <SectionReveal theme="dark" prevTheme="light">
        <StackMetrics />
      </SectionReveal>
      <SectionReveal theme="light" prevTheme="dark">
        <ExperienceTimeline />
      </SectionReveal>
      <SectionReveal theme="dark" prevTheme="light">
        <Contact />
      </SectionReveal>
    </main>
  );
}
