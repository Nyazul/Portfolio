import { siteConfig } from "@/lib/site-config";
import { MagneticHover } from "@/components/motion/MagneticHover";

// Hero itself isn't wrapped in SectionReveal (PRD 7.1) - it's the first
// thing visible on load, there's no scroll position to reveal it from.
// Phase 3 adds the canvas particle background here (PRD 7.2).
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
        <MagneticHover strength={8}>
          <h1 className="text-4xl leading-tight font-medium tracking-tight text-text-primary md:text-6xl">
            {siteConfig.role}
          </h1>
        </MagneticHover>
        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          {siteConfig.tagline}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <MagneticHover strength={12}>
            <a
              href="#architecture"
              className="block border border-text-primary px-6 py-3 text-sm text-text-primary transition-colors duration-200 hover:bg-text-primary hover:text-inverse-text"
            >
              View architecture
            </a>
          </MagneticHover>
          <MagneticHover strength={12}>
            <a
              href="#work"
              className="block border border-border px-6 py-3 text-sm text-text-secondary transition-colors duration-200 hover:border-text-primary hover:text-text-primary"
            >
              Read case studies
            </a>
          </MagneticHover>
        </div>
      </div>
    </section>
  );
}
