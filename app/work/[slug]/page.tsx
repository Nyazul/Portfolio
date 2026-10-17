import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { caseStudies, getCaseStudy } from "@/lib/case-studies";
import { siteUrl } from "@/lib/site-config";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};
  return {
    title: `${study.title} — Nyazul Ansari`,
    description: study.excerpt,
    openGraph: { title: study.title, description: study.excerpt },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.excerpt,
    url: `${siteUrl}/work/${study.slug}`,
    author: { "@type": "Person", name: "Nyazul Ansari" },
  };

  return (
    <main id="main" className="section-pad px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div className="mx-auto max-w-2xl">
        <Link
          href="/#work"
          className="mb-12 inline-block font-mono text-sm text-text-tertiary hover:text-text-primary"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-medium text-text-primary md:text-4xl">
          {study.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {study.stack.map((tag) => (
            <span
              key={tag}
              className="border border-border px-2 py-1 font-mono text-xs text-text-tertiary"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-10 space-y-6 text-lg leading-normal text-text-secondary">
          {study.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
