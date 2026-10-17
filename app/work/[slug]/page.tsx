import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  caseStudies,
  getAdjacentCaseStudies,
  getCaseStudy,
  isFilled,
  type ApproachStep,
} from "@/lib/case-studies";
import { siteConfig, siteUrl } from "@/lib/site-config";
import { CodeBlock } from "@/components/case-study/CodeBlock";
import { RaceTimeline } from "@/components/case-study/RaceTimeline";

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
    title: `${study.title} — ${siteConfig.name}`,
    description: study.excerpt,
    openGraph: { title: study.title, description: study.excerpt },
  };
}

const isDev = process.env.NODE_ENV === "development";

// Unfilled TODO(nyazul) values: a dashed placeholder in dev so the gap is
// obvious while editing, nothing at all in production.
function Fillable({
  value,
  children,
}: {
  value: string;
  children: (v: string) => React.ReactNode;
}) {
  if (isFilled(value)) return <>{children(value)}</>;
  if (!isDev) return null;
  return (
    <span className="inline-block border border-dashed border-accent px-2 py-0.5 font-mono text-xs text-accent">
      {value}
    </span>
  );
}

function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border pt-10">
      <h2 className="mb-6 font-mono text-sm text-text-tertiary">{label}</h2>
      {children}
    </section>
  );
}

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-5 text-lg leading-relaxed text-text-secondary">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Step({ step, index }: { step: ApproachStep; index: number }) {
  return (
    <div className="mt-12 first:mt-0">
      <h3 className="mb-4 flex items-baseline gap-3 text-xl font-medium text-text-primary md:text-2xl">
        <span className="font-mono text-sm text-accent">
          {String(index + 1).padStart(2, "0")}
        </span>
        {step.heading}
      </h3>
      <Prose paragraphs={step.body} />
      {step.diagram === "race-timeline" && <RaceTimeline />}
      {step.callouts && (
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {step.callouts.map((c) => (
            <div key={c.label} className="bg-bg-elevated p-5">
              <p className="font-mono text-xs text-accent">{c.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      )}
      {step.code && <CodeBlock code={step.code} />}
    </div>
  );
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const { prev, next } = getAdjacentCaseStudies(slug);
  // Size the facts grid by what will actually render, so a dropped TODO in
  // production doesn't leave an empty cell.
  const facts = isDev
    ? study.keyFacts
    : study.keyFacts.filter((f) => isFilled(f.value));
  const factCols =
    ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"][facts.length] ??
    "sm:grid-cols-3";
  const index = caseStudies.findIndex((c) => c.slug === slug);

  const toc = [
    { id: "problem", label: "Problem" },
    { id: "approach", label: "Approach" },
    { id: "outcome", label: "Outcome" },
    ...(study.lessons?.length ? [{ id: "lessons", label: "Lessons" }] : []),
  ];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.excerpt,
    url: `${siteUrl}/work/${study.slug}`,
    author: { "@type": "Person", name: siteConfig.name },
  };

  return (
    <main id="main" className="px-6 pt-36 pb-24 md:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Header */}
      <header className="mx-auto max-w-6xl">
        <Link
          href="/#work"
          className="inline-block font-mono text-sm text-text-tertiary transition-colors hover:text-accent"
        >
          ← All work
        </Link>
        <p className="mt-12 font-mono text-sm text-text-tertiary">
          Case study {String(index + 1).padStart(2, "0")} /{" "}
          {String(caseStudies.length).padStart(2, "0")}
        </p>
        <h1 className="mt-4 max-w-4xl text-[clamp(2.25rem,6vw,4.75rem)] leading-[1.02] font-medium tracking-tight text-text-primary">
          {study.title}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
          {study.excerpt}
        </p>

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 font-mono text-sm">
          <div>
            <dt className="text-text-tertiary">Role</dt>
            <dd className="mt-1 text-text-primary">{study.role}</dd>
          </div>
          <Fillable value={study.timeframe}>
            {(v) => (
              <div>
                <dt className="text-text-tertiary">When</dt>
                <dd className="mt-1 text-text-primary">{v}</dd>
              </div>
            )}
          </Fillable>
          <div>
            <dt className="text-text-tertiary">Stack</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {study.stack.map((tag) => (
                <span
                  key={tag}
                  className="border border-border px-2 py-0.5 text-xs text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        </dl>

        {/* Key facts strip */}
        <div className={`mt-14 grid gap-px overflow-hidden border border-border bg-border ${factCols}`}>
          {facts.map((fact) => (
            <div key={fact.label} className="bg-bg p-6">
              <Fillable value={fact.value}>
                {(v) => (
                  <p className="text-5xl font-medium tracking-tight text-accent md:text-6xl">
                    {v}
                  </p>
                )}
              </Fillable>
              <p className="mt-3 text-sm text-text-tertiary">{fact.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Body with sticky TOC on large screens */}
      <div className="mx-auto mt-20 grid max-w-6xl gap-12 lg:grid-cols-[180px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-32 space-y-3 font-mono text-sm">
            {toc.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-text-tertiary transition-colors hover:text-accent"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="max-w-3xl space-y-16">
          <Section id="problem" label="Problem">
            <Prose paragraphs={study.problem} />
          </Section>

          <Section id="approach" label="Approach">
            {study.approach.map((step, i) => (
              <Step key={step.heading} step={step} index={i} />
            ))}
          </Section>

          <Section id="outcome" label="Outcome">
            <Prose paragraphs={study.outcome} />
          </Section>

          {study.lessons?.length ? (
            <Section id="lessons" label="Lessons">
              <ul className="space-y-4">
                {study.lessons.map((lesson) => (
                  <li
                    key={lesson}
                    className="border-l-2 border-accent pl-5 text-lg leading-relaxed text-text-primary"
                  >
                    {lesson}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </article>
      </div>

      {/* Prev / next */}
      <nav
        aria-label="More case studies"
        className="mx-auto mt-28 grid max-w-6xl gap-px overflow-hidden border border-border bg-border md:grid-cols-2"
      >
        {[
          { study: prev, label: "← Previous" },
          { study: next, label: "Next →" },
        ].map(({ study: s, label }) => (
          <Link
            key={label}
            href={`/work/${s.slug}`}
            data-cursor="Read"
            className={`group bg-bg p-8 transition-colors duration-300 hover:bg-surface ${
              label.startsWith("Next") ? "md:text-right" : ""
            }`}
          >
            <p className="font-mono text-xs text-text-tertiary transition-colors group-hover:text-accent">
              {label}
            </p>
            <p className="mt-3 text-xl font-medium text-text-primary">
              {s.title}
            </p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
