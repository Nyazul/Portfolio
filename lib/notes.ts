import type { CodeSample } from "@/lib/case-studies";
import { isDev } from "@/lib/todo";

// Short engineering notes: smaller and more opinionated than a case study.
// Same structured-data approach as lib/case-studies.ts (no MDX pipeline),
// rendered by app/notes/[slug]/page.tsx.
//
// `draft: true` notes render in dev only, with a "Draft" badge, and are
// left out of production pages, the sitemap, RSS and the command palette -
// the same "never ship an unreviewed placeholder" rule as TODO(nyazul).
// The two drafts below were written from facts already in the case studies;
// read them, rewrite anything that isn't in your voice, then flip `draft`.

export type NoteBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; code: CodeSample }
  // Pointer to a case study for the long version.
  | { type: "case-study"; slug: string; text: string };

export type Note = {
  slug: string;
  title: string;
  // ISO date (YYYY-MM-DD) shown on the page and used for ordering/RSS.
  date: string;
  summary: string;
  tags: string[];
  draft?: boolean;
  body: NoteBlock[];
};

const notes: Note[] = [
  {
    slug: "health-checks-are-production-code",
    title: "Health checks are production code",
    date: "2026-10-18",
    summary:
      "A probe that runs every 15 seconds runs 5,760 times a day. If each run leaves one thing behind, the arithmetic, not the probe, decides when you go down.",
    tags: ["Docker", "Linux", "Operations"],
    draft: true,
    body: [
      {
        type: "p",
        text: "Health checks feel like scaffolding: a few characters of shell in a compose file, written once, never reviewed. But they run more often than almost anything else in the system, and they run forever.",
      },
      {
        type: "p",
        text: "A Kafka container's health check opened a TCP connection to itself every 15 seconds. Each run left one zombie process behind, because PID 1 in that container was the JVM, and the JVM doesn't reap children it didn't start. One zombie per run is 240 an hour. The host's task table held 31,069. Divide, and you get 5.4 days of uptime before every fork() on the machine fails.",
      },
      { type: "h2", text: "Four questions for anything periodic" },
      {
        type: "list",
        items: [
          "What does one run leave behind: a process, a file, a connection, a row?",
          "Multiply by runs per day. Small leaks at high frequency are big leaks.",
          "Who cleans it up? In a container, that's PID 1's job, and your app is a poor PID 1.",
          "Are you watching the resource that would actually run out, or only the ones that are easy to graph?",
        ],
      },
      {
        type: "code",
        code: {
          lang: "yaml",
          caption: "The one-line fix: tini as PID 1 reaps health-check children",
          snippet: `kafka:
  image: apache/kafka:3.7.0
  init: true`,
        },
      },
      {
        type: "case-study",
        slug: "zombie-process-outage",
        text: "The full investigation, including the monitor that now watches the task table.",
      },
    ],
  },
  {
    slug: "check-then-act-is-a-hypothesis",
    title: "Check-then-act is a hypothesis",
    date: "2026-10-18",
    summary:
      "Code that's correct one request at a time hasn't been tested yet. If an invariant matters, put it where every write has to pass through it.",
    tags: ["PostgreSQL", "Concurrency", "Spring Boot"],
    draft: true,
    body: [
      {
        type: "p",
        text: "Read the row, compare in application code, write the new value back. It's the most natural way to enforce a limit, and it's correct right up until two requests arrive inside the gap between the read and the write.",
      },
      {
        type: "p",
        text: "In a usage-billing system that gap let two requests both see 'one unit left', both pass the check, and both get through. No exception, no log line, just a workspace quietly over its quota.",
      },
      { type: "h2", text: "The half-fix that looks like a fix" },
      {
        type: "p",
        text: "Moving the increment into SQL (SET count = count + 1) makes the write atomic, but the check still happens in Java against a stale read. You've traded a lost update for an over-quota row, which is exactly where the system I work on sits today. The check and the write have to be the same statement.",
      },
      {
        type: "code",
        code: {
          lang: "sql",
          caption: "The invariant lives in the WHERE clause",
          snippet: `UPDATE workspace_usage_counters
   SET count = count + :amount
 WHERE workspace_id = :workspaceId
   AND feature_key  = :feature
   AND period_start = :periodStart
   AND count + :amount <= :limit;
-- 1 row: allowed. 0 rows: over quota.`,
        },
      },
      {
        type: "quote",
        text: "If an invariant matters, put it where every write path has to pass through it. Usually that's the database, not a service method.",
      },
      {
        type: "case-study",
        slug: "billing-concurrency",
        text: "The case study has an interactive version: race the two requests yourself, under all three implementations.",
      },
    ],
  },
];

// What this environment shows: everything in dev, published notes only in
// production. Newest first.
export function getNotes(): Note[] {
  return notes
    .filter((n) => isDev || !n.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getNote(slug: string): Note | undefined {
  return getNotes().find((n) => n.slug === slug);
}

export function formatNoteDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
