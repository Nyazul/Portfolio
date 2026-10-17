import { ContactForm } from "@/components/ContactForm";
import { siteConfig } from "@/lib/site-config";
import { SectionSplit } from "@/components/motion/SectionSplit";
import { sectionShapes } from "@/lib/particle-shapes";
import { SectionHeading } from "@/components/SectionHeading";

export function Contact() {
  return (
    <SectionSplit id="contact" theme="light" shapePoints={sectionShapes.contact}>
      <SectionHeading index="07" label="Contact" headline="Let's build something durable." />
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <p className="max-w-md text-lg text-text-secondary">
            Open to backend/full-stack roles at product companies. The
            fastest way to reach me is email — the form works too.
          </p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="mt-6 inline-block text-text-primary underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
          >
            {siteConfig.email}
          </a>
        </div>
        <ContactForm />
      </div>
    </SectionSplit>
  );
}
