import { SectionSplit } from "@/components/motion/SectionSplit";
import { SectionHeading } from "@/components/SectionHeading";
import { ProjectsList } from "@/components/ProjectsList";
import { sectionShapes } from "@/lib/particle-shapes";

// Projects get their own section, separate from the case studies. Like
// every home section it takes the next step of the dark/light and
// left/right alternation (see app/page.tsx).
export function ProjectsSection() {
  return (
    <SectionSplit id="projects" theme="light" shapePoints={sectionShapes.projects}>
      <SectionHeading index="03" label="Projects" headline="Systems I've built." />
      <ProjectsList />
    </SectionSplit>
  );
}
