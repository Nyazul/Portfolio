import { createHighlighter, type ThemeRegistration } from "shiki";
import type { CodeSample } from "@/lib/case-studies";

// Monochrome + one accent, matching the site palette rather than a stock
// editor theme. Server component only - shiki runs at build time for these
// statically generated pages, so none of it ships to the client.
const theme: ThemeRegistration = {
  name: "nyazul-mono",
  type: "dark",
  colors: {
    "editor.background": "#121212",
    "editor.foreground": "#D4D4D4",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#6B6B6B", fontStyle: "italic" },
    },
    {
      scope: ["keyword", "storage", "storage.type", "storage.modifier"],
      settings: { foreground: "#FF6B2C" },
    },
    {
      scope: [
        "storage.type.annotation",
        "punctuation.definition.annotation",
        "meta.declaration.annotation",
      ],
      settings: { foreground: "#E5A07E" },
    },
    {
      scope: ["string", "string.quoted"],
      settings: { foreground: "#A3A3A3" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "#F5F5F5" },
    },
    {
      scope: ["entity.name.function", "entity.name.type", "support.type"],
      settings: { foreground: "#F5F5F5" },
    },
  ],
};

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;
function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: [theme],
    langs: ["java", "sql", "yaml", "bash"],
  });
  return highlighterPromise;
}

export async function CodeBlock({ code }: { code: CodeSample }) {
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(code.snippet, {
    lang: code.lang,
    theme: "nyazul-mono",
  });

  return (
    <figure className="my-8 overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <figcaption className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-xs text-text-tertiary">
        <span>{code.caption}</span>
        <span className="uppercase">{code.lang}</span>
      </figcaption>
      <div
        className="code-block overflow-x-auto text-[13px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
