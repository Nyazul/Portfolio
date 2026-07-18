import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ArchitectureSection } from "@/components/ArchitectureSection";
import { CaseStudies } from "@/components/CaseStudies";
import { StackMetrics } from "@/components/StackMetrics";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { Contact } from "@/components/Contact";
import { SectionReveal } from "@/components/motion/SectionReveal";

// Phase 2: GSAP pinned row-flip reveal on each section below the hero
// (PRD 7.1), with automatic fallback to a plain fade-in on mobile or
// prefers-reduced-motion (PRD 7.5) - see SectionReveal for the branching.
// Hero itself is never wrapped - it's the first thing visible on load.
export default function Home() {
  return (
    <main>
      <Hero />
      <SectionReveal>
        <About />
      </SectionReveal>
      <SectionReveal>
        <ArchitectureSection />
      </SectionReveal>
      <SectionReveal>
        <CaseStudies />
      </SectionReveal>
      <SectionReveal>
        <StackMetrics />
      </SectionReveal>
      <SectionReveal>
        <ExperienceTimeline />
      </SectionReveal>
      <SectionReveal>
        <Contact />
      </SectionReveal>
    </main>
  );
}
