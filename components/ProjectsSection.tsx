import { SectionSplit } from "@/components/motion/SectionSplit";
import { SectionHeading } from "@/components/SectionHeading";
import { ProjectsList } from "@/components/ProjectsList";
import { sectionShapes } from "@/lib/particle-shapes";

// Projects get their own section, separate from the case studies. It sits
// right after Architecture and shares its dark palette on purpose: it reads
// as "here's the platform, and here's what's built on it", and keeps every
// later section's dark/light alternation (and row-flip reveal) unchanged.
export function ProjectsSection() {
  return (
    <SectionSplit id="projects" theme="dark" shapePoints={sectionShapes.projects}>
      <SectionHeading index="03" label="Projects" headline="Systems I've built." />
      <ProjectsList />
    </SectionSplit>
  );
}
