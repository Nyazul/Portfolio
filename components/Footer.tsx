import { siteConfig } from "@/lib/site-config";
import { MagneticHover } from "@/components/motion/MagneticHover";
import { InvertBlobHover } from "@/components/motion/InvertBlobHover";
import { LocalTime } from "@/components/LocalTime";

const links = [
  { href: siteConfig.github, label: "GitHub" },
  { href: siteConfig.linkedin, label: "LinkedIn" },
  { href: "/Nyazul_Ansari_Resume.pdf", label: "Résumé" },
];

// Closing block rather than a thin copyright bar: one oversized call to
// action (same invert-blob + magnetic treatment as the hero name, so the page
// ends the way it opens), then the small print.
export function Footer() {
  return (
    <footer className="relative z-[6] overflow-hidden border-t border-border bg-bg px-6 pt-24 pb-10 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <p className="flex items-center gap-2 font-mono text-sm text-text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Have a system that needs to hold up?
        </p>
        <MagneticHover strength={6} className="mt-6 inline-block">
          <InvertBlobHover size={260}>
            <a
              href={`mailto:${siteConfig.email}`}
              data-cursor="Email"
              className="block text-[clamp(3.5rem,13vw,11rem)] leading-[0.9] font-medium tracking-tight text-text-primary"
            >
              Let&apos;s talk<span className="text-accent">.</span>
            </a>
          </InvertBlobHover>
        </MagneticHover>

        <div className="mt-20 grid gap-10 border-t border-border pt-8 text-sm text-text-tertiary md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-text-primary">{siteConfig.email}</p>
            <p>
              {siteConfig.location} · <LocalTime />
            </p>
          </div>
          <ul className="flex gap-6 md:justify-center">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="transition-colors hover:text-accent"
                  {...(link.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="space-y-1 md:text-right">
            <p>© {new Date().getFullYear()} {siteConfig.name}</p>
            <p className="font-mono text-xs">Built with Next.js, GSAP &amp; R3F</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
