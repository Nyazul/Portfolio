import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import { formatNoteDate, getNote, getNotes, type NoteBlock } from "@/lib/notes";
import { getCaseStudy } from "@/lib/case-studies";
import { siteConfig, siteUrl } from "@/lib/site-config";
import { CodeBlock } from "@/components/case-study/CodeBlock";
import { DraftBadge } from "@/components/DraftBadge";

// Production builds only generate published notes; a draft's URL 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return getNotes().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return {};
  return {
    title: `${note.title} — ${siteConfig.name}`,
    description: note.summary,
    openGraph: { title: note.title, description: note.summary, type: "article" },
  };
}

function Block({ block }: { block: NoteBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-lg leading-relaxed text-text-secondary">{block.text}</p>;
    case "h2":
      return <h2 className="pt-6 text-2xl font-medium text-text-primary">{block.text}</h2>;
    case "list":
      return (
        <ul className="space-y-3">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-lg leading-relaxed text-text-secondary">
              <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-accent pl-5 text-xl leading-relaxed text-text-primary">
          {block.text}
        </blockquote>
      );
    case "code":
      return <CodeBlock code={block.code} />;
    case "case-study": {
      const study = getCaseStudy(block.slug);
      if (!study) return null;
      return (
        <Link
          href={`/work/${study.slug}`}
          data-cursor="Read"
          className="group block rounded-lg border border-border bg-bg-elevated p-6 transition-colors hover:border-accent"
        >
          <p className="font-mono text-xs text-text-tertiary group-hover:text-accent">Case study →</p>
          <p className="mt-2 text-xl font-medium text-text-primary">{study.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{block.text}</p>
        </Link>
      );
    }
  }
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: note.title,
    description: note.summary,
    datePublished: note.date,
    url: `${siteUrl}/notes/${note.slug}`,
    author: { "@type": "Person", name: siteConfig.name },
  };

  return (
    <main id="main" className="px-6 pt-36 pb-24 md:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <Link
          href="/notes"
          className="inline-block font-mono text-sm text-text-tertiary transition-colors hover:text-accent"
        >
          ← All notes
        </Link>
        <p className="mt-12 flex flex-wrap items-center gap-3 font-mono text-sm text-text-tertiary">
          <time dateTime={note.date}>{formatNoteDate(note.date)}</time>
          {note.tags.map((tag) => (
            <span key={tag} className="border border-border px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))}
          {note.draft && <DraftBadge />}
        </p>
        <h1
          className="mt-4 text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] font-medium tracking-tight text-text-primary"
          style={{ viewTransitionName: `note-title-${note.slug}` }}
        >
          {note.title}
        </h1>
        <p className="mt-6 text-xl leading-relaxed text-text-primary">{note.summary}</p>
        <div className="mt-12 space-y-6 border-t border-border pt-10">
          {note.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>
    </main>
  );
}
