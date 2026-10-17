import type { Metadata } from "next";
import { Link } from "@/components/ViewTransitions";
import { formatNoteDate, getNotes } from "@/lib/notes";
import { siteConfig } from "@/lib/site-config";
import { DraftBadge } from "@/components/DraftBadge";

export const metadata: Metadata = {
  title: `Notes — ${siteConfig.name}`,
  description: "Short engineering notes on concurrency, operations and backend design.",
  alternates: { types: { "application/rss+xml": "/notes/rss.xml" } },
};

export default function NotesIndex() {
  const notes = getNotes();

  return (
    <main id="main" className="px-6 pt-36 pb-24 md:pt-44">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-sm text-text-tertiary">
          Notes <span className="text-accent">/</span>{" "}
          <a href="/notes/rss.xml" className="transition-colors hover:text-accent">
            RSS
          </a>
        </p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.25rem,6vw,4.75rem)] leading-[1.02] font-medium tracking-tight text-text-primary">
          Smaller things worth writing down.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Short notes from production: what broke, what the fix taught me, and the rules of
          thumb I kept. The long versions are the{" "}
          <Link href="/#work" className="text-text-primary underline decoration-dotted underline-offset-4 hover:text-accent">
            case studies
          </Link>
          .
        </p>

        {notes.length === 0 ? (
          <p className="mt-16 border-t border-border pt-8 font-mono text-sm text-text-tertiary">
            Nothing published yet.
          </p>
        ) : (
          <ol className="mt-16 border-t border-border">
            {notes.map((note) => (
              <li key={note.slug} className="border-b border-border">
                <Link
                  href={`/notes/${note.slug}`}
                  data-cursor="Read"
                  className="group grid gap-3 py-8 md:grid-cols-[9rem_1fr] md:gap-6"
                >
                  <time dateTime={note.date} className="font-mono text-sm text-text-tertiary">
                    {formatNoteDate(note.date)}
                  </time>
                  <div>
                    <h2
                      className="flex flex-wrap items-center gap-3 text-xl font-medium text-text-primary transition-colors group-hover:text-accent md:text-2xl"
                      style={{ viewTransitionName: `note-title-${note.slug}` }}
                    >
                      {note.title}
                      {note.draft && <DraftBadge />}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
                      {note.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.tags.map((tag) => (
                        <span key={tag} className="border border-border px-2 py-0.5 font-mono text-xs text-text-tertiary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
