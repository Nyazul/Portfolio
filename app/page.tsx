import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ArchitectureSection } from "@/components/ArchitectureSection";
import { CaseStudies } from "@/components/CaseStudies";
import { StackMetrics } from "@/components/StackMetrics";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { Contact } from "@/components/Contact";

// Phase 1: plain stacked sections, no GSAP pinned/flip transitions yet
// (that's Phase 2, PRD Section 7.1) and no motion beyond CSS transitions.
// This is the required ship criterion for Phase 1 - a fully readable,
// fully functional site with motion completely absent.
export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <ArchitectureSection />
      <CaseStudies />
      <StackMetrics />
      <ExperienceTimeline />
      <Contact />
    </main>
  );
}
