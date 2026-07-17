import { ContactForm } from "@/components/ContactForm";
import { siteConfig } from "@/lib/site-config";

export function Contact() {
  return (
    <section id="contact" className="section-pad px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 font-mono text-sm text-text-tertiary">
          06 / Contact
        </h2>
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="max-w-md text-lg text-text-secondary">
              Open to backend/full-stack roles at product companies. The
              fastest way to reach me is email — the form works too.
            </p>
            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-6 inline-block text-text-primary underline underline-offset-4"
            >
              {siteConfig.email}
            </a>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
