import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Cursor } from "@/components/motion/Cursor";
import { CommandPalette } from "@/components/CommandPalette";
import { BootLoader } from "@/components/BootLoader";
import { BOOT_SEEN_KEY } from "@/lib/boot";
import { caseStudies } from "@/lib/case-studies";
import { getNotes } from "@/lib/notes";
import { projects } from "@/lib/projects";
import { siteConfig, siteUrl } from "@/lib/site-config";
import { ViewTransitions } from "@/components/ViewTransitions";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${siteConfig.name} — ${siteConfig.role}`,
  description: siteConfig.tagline,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.role}`,
    description: siteConfig.tagline,
    url: siteUrl,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.role}`,
    description: siteConfig.tagline,
  },
};

// Runs before first paint: skip the boot loader for anyone who has already
// seen it this session, or who prefers reduced motion. Doing this in CSS via
// a data attribute (rather than after hydration) means it never flashes.
const bootDecisionScript = `try{if(sessionStorage.getItem(${JSON.stringify(BOOT_SEEN_KEY)})||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.boot="skip"}catch(e){document.documentElement.dataset.boot="skip"}`;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: siteConfig.name,
  jobTitle: siteConfig.role,
  url: siteUrl,
  email: siteConfig.email,
  sameAs: [siteConfig.github, siteConfig.linkedin],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ViewTransitions: route changes made through its <Link> run inside
  // document.startViewTransition, so elements sharing a view-transition-name
  // (a case-study title on the home list and the same title on its page)
  // morph between routes. Browsers without the API just navigate normally.
  return (
    <ViewTransitions>
      <html
        lang="en"
        className={`${inter.variable} ${jetbrains.variable}`}
        // The boot script writes data-boot before hydration.
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: bootDecisionScript }} />
          <noscript>
            <style>{`#boot-loader{display:none!important}`}</style>
          </noscript>
        </head>
        <body>
          <BootLoader />
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
          />
          <Nav />
          {children}
          <Footer />
          <Cursor />
          {/* Only slugs and titles cross into the client bundle, not the
              case-study bodies. */}
          <CommandPalette
            caseStudies={caseStudies.map(({ slug, title }) => ({ slug, title }))}
            projects={projects.map(({ slug, title }) => ({ slug, title }))}
            notes={getNotes().map(({ slug, title }) => ({ slug, title }))}
          />
        </body>
      </html>
    </ViewTransitions>
  );
}
