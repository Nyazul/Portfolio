import { getNotes } from "@/lib/notes";
import { siteConfig, siteUrl } from "@/lib/site-config";

// RSS 2.0 feed of published notes, generated at build time.
export const dynamic = "force-static";

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const items = getNotes()
    .map((n) => {
      const url = `${siteUrl}/notes/${n.slug}`;
      return `    <item>
      <title>${escape(n.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(`${n.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(n.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(`${siteConfig.name} — Notes`)}</title>
    <link>${siteUrl}/notes</link>
    <description>Short engineering notes on concurrency, operations and backend design.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
