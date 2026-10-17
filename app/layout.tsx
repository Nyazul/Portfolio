import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Cursor } from "@/components/motion/Cursor";
import { CommandPalette } from "@/components/CommandPalette";
import { caseStudies } from "@/lib/case-studies";
import { getNotes } from "@/lib/notes";
import { siteConfig, siteUrl } from "@/lib/site-config";
import { ViewTransitions } from "next-view-transitions";

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
  // ViewTransitions: route changes made through next-view-transitions'
  // <Link> run inside document.startViewTransition, so elements sharing a
  // view-transition-name (a case-study title on the home list and the same
  // title on its page) morph between routes. Browsers without the API just
  // navigate normally.
  return (
    <ViewTransitions>
      <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
        <body>
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
            notes={getNotes().map(({ slug, title }) => ({ slug, title }))}
          />
        </body>
      </html>
    </ViewTransitions>
  );
}
