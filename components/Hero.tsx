import { siteConfig } from "@/lib/site-config";

// Phase 1: static hero, no particle field or magnetic hover yet.
// Phase 3 adds the canvas particle background (PRD 7.2).
// Phase 2 adds the MagneticHover component on the heading/CTAs (PRD 6.1, 7.4).
export function Hero() {
  return (
    <section
      id="top"
      className="section-pad flex min-h-[90vh] flex-col justify-center border-b border-border px-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-4 font-mono text-sm text-text-tertiary">
          {siteConfig.name}
        </p>
        <h1 className="text-4xl leading-tight font-medium tracking-tight text-text-primary md:text-6xl">
          {siteConfig.role}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          {siteConfig.tagline}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#architecture"
            className="border border-text-primary px-6 py-3 text-sm text-text-primary transition-colors duration-200 hover:bg-text-primary hover:text-inverse-text"
          >
            View architecture
          </a>
          <a
            href="#work"
            className="border border-border px-6 py-3 text-sm text-text-secondary transition-colors duration-200 hover:border-text-primary hover:text-text-primary"
          >
            Read case studies
          </a>
        </div>
      </div>
    </section>
  );
}
