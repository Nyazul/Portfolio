import { SectionSplit } from "@/components/motion/SectionSplit";
import { sectionShapes } from "@/lib/particle-shapes";
import { SectionHeading } from "@/components/SectionHeading";

export function About() {
  return (
    <SectionSplit id="about" theme="light" shapePoints={sectionShapes.about}>
      <SectionHeading index="01" label="About" headline="Systems that hold up after the demo." />
      <div className="max-w-2xl space-y-6 text-lg leading-normal text-text-secondary">
        <p>
          I&apos;m a Java engineer at YSM Infosolution, finishing an M.Sc. in
          Computer Science at SPPU. Most of my time goes into a
          multi-tenant workspace platform with its own billing engine,
          permission system, and automation layer — built on a modular
          Spring Boot architecture with Kafka as the backbone between
          domains.
        </p>
        <p>
          I care less about frameworks and more about what breaks under
          load: lost updates in billing, silent constraint violations in
          activity logs, non-deterministic query ordering that looks fine
          in dev and flakes in production. Most of the case studies below
          are about finding and fixing exactly that class of problem.
        </p>
      </div>
    </SectionSplit>
  );
}
