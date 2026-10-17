"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { siteConfig } from "@/lib/site-config";
import { HEALTH_ENDPOINT } from "@/lib/health";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// Anything can open the palette by dispatching this (the nav's ⌘K button).
export const OPEN_PALETTE_EVENT = "palette:open";

export type PaletteEntry = { slug: string; title: string };

type OutLine =
  | { kind: "text"; text: string; tone?: "muted" | "accent" | "primary" }
  | { kind: "link"; text: string; href: string; external?: boolean }
  | { kind: "input"; text: string };

type Suggestion = { line: string; description: string };

const SECTIONS = ["about", "architecture", "work", "stack", "principles", "experience", "contact"];
const RESUME = "/Nyazul_Ansari_Resume.pdf";
const MAX_SUGGESTIONS = 7;
const PROMPT = "nyazul@portfolio:~$";

const WELCOME: OutLine[] = [
  { kind: "text", text: "Type a command, or pick one below. `help` lists everything.", tone: "muted" },
];

// A terminal-flavoured command palette (⌘K / Ctrl+K). Every command maps to
// something real on the site - jump to a section, open a case study, fetch
// the live health endpoint - plus a few unlisted ones for the curious.
export function CommandPalette({
  caseStudies,
  notes,
}: {
  caseStudies: PaletteEntry[];
  notes: PaletteEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<OutLine[]>(WELCOME);
  const [active, setActive] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Global shortcut + programmatic open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  // Focus in on open, back to wherever it was on close; lock page scroll.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [output]);

  const goToSection = useCallback(
    (id: string) => {
      close();
      if (pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        history.replaceState(null, "", `#${id}`);
      } else {
        router.push(`/#${id}`);
      }
    },
    [close, pathname, prefersReducedMotion, router],
  );

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const suggestions: Suggestion[] = useMemo(
    () => [
      { line: "help", description: "List commands" },
      { line: "whoami", description: "Who built this" },
      ...SECTIONS.map((s) => ({ line: `cd ${s}`, description: `Jump to ${s}` })),
      { line: "ls work/", description: "List case studies" },
      ...caseStudies.map((c) => ({ line: `open work/${c.slug}`, description: c.title })),
      ...(notes.length
        ? [
            { line: "ls notes/", description: "List engineering notes" },
            ...notes.map((n) => ({ line: `open notes/${n.slug}`, description: n.title })),
          ]
        : []),
      { line: "cat resume.pdf", description: "Open the résumé" },
      { line: "ssh contact", description: "Get in touch" },
      { line: "copy email", description: siteConfig.email },
      { line: "open github", description: "GitHub profile" },
      { line: "open linkedin", description: "LinkedIn profile" },
      { line: `curl ${HEALTH_ENDPOINT}`, description: "Hit this site's health check" },
      { line: "git log -1", description: "Which build is live" },
      { line: "clear", description: "Clear the screen" },
      { line: "exit", description: "Close" },
    ],
    [caseStudies, notes],
  );

  const query = input.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return suggestions.slice(0, MAX_SUGGESTIONS);
    const starts = suggestions.filter((s) => s.line.startsWith(query));
    const contains = suggestions.filter(
      (s) =>
        !s.line.startsWith(query) &&
        (s.line.includes(query) || s.description.toLowerCase().includes(query)),
    );
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [query, suggestions]);

  useEffect(() => {
    setActive(0);
    setNavigated(false);
  }, [query]);

  const print = (lines: OutLine[]) => setOutput((o) => [...o, ...lines]);

  async function run(raw: string) {
    const line = raw.trim();
    setInput("");
    if (!line) return;
    const echo: OutLine = { kind: "input", text: line };
    const [cmd, ...args] = line.split(/\s+/);
    const arg = args.join(" ").replace(/\/$/, "");

    const out = (lines: OutLine[]) => print([echo, ...lines]);

    switch (cmd.toLowerCase()) {
      case "help":
        out([
          ...suggestions
            .filter((s) => !s.line.startsWith("open work/") && !s.line.startsWith("open notes/"))
            .map((s): OutLine => ({ kind: "text", text: `${s.line.padEnd(22, " ")}${s.description}` })),
          { kind: "text", text: "A few commands aren't listed.", tone: "muted" },
        ]);
        return;
      case "whoami":
        out([
          { kind: "text", text: siteConfig.name, tone: "primary" },
          { kind: "text", text: siteConfig.role },
          { kind: "text", text: siteConfig.tagline, tone: "muted" },
          { kind: "text", text: `${siteConfig.location} · ${siteConfig.availability}`, tone: "accent" },
        ]);
        return;
      case "cd": {
        const target = arg.replace(/^[~/#]+/, "").toLowerCase();
        if (!target) return goToSection("top");
        if (SECTIONS.includes(target)) return goToSection(target);
        if (target === "notes") return navigate("/notes");
        out([{ kind: "text", text: `cd: no such section: ${arg}. Try: ${SECTIONS.join(", ")}`, tone: "muted" }]);
        return;
      }
      case "ls": {
        const dir = arg.replace(/^~?\/?/, "");
        if (dir === "work") {
          out(caseStudies.map((c) => ({ kind: "link", text: `${c.slug}  ${c.title}`, href: `/work/${c.slug}` })));
        } else if (dir === "notes") {
          out(
            notes.length
              ? notes.map((n) => ({ kind: "link", text: `${n.slug}  ${n.title}`, href: `/notes/${n.slug}` }))
              : [{ kind: "text", text: "notes/ is empty for now.", tone: "muted" }],
          );
        } else if (!dir) {
          out([
            {
              kind: "text",
              text: [...SECTIONS.map((s) => `${s}/`), ...(notes.length ? ["notes/"] : []), "resume.pdf"].join("  "),
            },
          ]);
        } else {
          out([{ kind: "text", text: `ls: cannot access '${arg}': No such directory`, tone: "muted" }]);
        }
        return;
      }
      case "open": {
        const target = arg.toLowerCase();
        if (target === "github" || target === "linkedin") {
          window.open(target === "github" ? siteConfig.github : siteConfig.linkedin, "_blank", "noopener,noreferrer");
          out([{ kind: "text", text: `Opened ${target} in a new tab.`, tone: "muted" }]);
          return;
        }
        if (target === "resume" || target === "resume.pdf") return run("cat resume.pdf");
        if (target === "notes") return navigate("/notes");
        const study = caseStudies.find((c) => target === `work/${c.slug}` || target === c.slug);
        if (study) return navigate(`/work/${study.slug}`);
        const note = notes.find((n) => target === `notes/${n.slug}`);
        if (note) return navigate(`/notes/${note.slug}`);
        out([{ kind: "text", text: `open: nothing called '${arg}'. Try \`ls work/\`.`, tone: "muted" }]);
        return;
      }
      case "cat":
        if (/^resume(\.pdf)?$/i.test(arg)) {
          window.open(RESUME, "_blank", "noopener");
          out([{ kind: "text", text: "Opened resume.pdf in a new tab.", tone: "muted" }]);
        } else {
          out([{ kind: "text", text: `cat: ${arg || "(nothing)"}: No such file. Try \`cat resume.pdf\`.`, tone: "muted" }]);
        }
        return;
      case "ssh":
        out([{ kind: "text", text: `Connecting to ${siteConfig.email}…`, tone: "muted" }]);
        window.setTimeout(() => goToSection("contact"), 400);
        return;
      case "copy":
      case "email":
      case "mail":
        try {
          await navigator.clipboard.writeText(siteConfig.email);
          out([{ kind: "text", text: `Copied ${siteConfig.email} to the clipboard.`, tone: "accent" }]);
        } catch {
          out([{ kind: "link", text: siteConfig.email, href: `mailto:${siteConfig.email}` }]);
        }
        return;
      case "curl":
      case "ping":
      case "uptime": {
        const start = performance.now();
        try {
          const res = await fetch(HEALTH_ENDPOINT, { cache: "no-store" });
          const ms = Math.round(performance.now() - start);
          const body = await res.json();
          out(
            cmd === "ping"
              ? [{ kind: "text", text: `pong from ${location.host}: time=${ms} ms`, tone: "accent" }]
              : [
                  { kind: "text", text: `HTTP ${res.status} · ${ms} ms`, tone: "accent" },
                  ...JSON.stringify(body, null, 2)
                    .split("\n")
                    .map((t): OutLine => ({ kind: "text", text: t, tone: "muted" })),
                ],
          );
        } catch {
          out([{ kind: "text", text: `${cmd}: ${HEALTH_ENDPOINT} unreachable`, tone: "accent" }]);
        }
        return;
      }
      case "git": {
        const sha = process.env.NEXT_PUBLIC_COMMIT_SHA;
        const builtAt = process.env.NEXT_PUBLIC_BUILT_AT;
        if (!sha) {
          out([{ kind: "text", text: "git: no build information in this environment.", tone: "muted" }]);
          return;
        }
        out([
          siteConfig.sourceRepo
            ? { kind: "link", text: `commit ${sha}`, href: `${siteConfig.sourceRepo}/commit/${sha}`, external: true }
            : { kind: "text", text: `commit ${sha}`, tone: "accent" },
          { kind: "text", text: `Built: ${builtAt ? new Date(builtAt).toUTCString() : "unknown"}`, tone: "muted" },
        ]);
        return;
      }
      case "clear":
        setOutput([]);
        return;
      case "exit":
      case "q":
      case ":q":
        close();
        return;
      // Unlisted.
      case "sudo":
        if (/^hire/.test(arg)) {
          out([
            { kind: "text", text: "[sudo] password for recruiter: ********", tone: "muted" },
            { kind: "text", text: "Permission granted. Opening a draft email…", tone: "accent" },
          ]);
          window.setTimeout(() => {
            window.location.href = `mailto:${siteConfig.email}?subject=${encodeURIComponent("Backend role")}`;
          }, 700);
        } else {
          out([{ kind: "text", text: `${siteConfig.name.split(" ")[0]} is not in the sudoers file. This incident will be reported.`, tone: "muted" }]);
        }
        return;
      case "rm":
        out([{ kind: "text", text: "rm: refusing. Deploys here are immutable; try `git revert` instead.", tone: "accent" }]);
        return;
      case "coffee":
      case "brew":
        out([{ kind: "text", text: "HTTP 418 I'm a teapot", tone: "accent" }]);
        return;
      case "vim":
      case "nano":
      case "emacs":
        out([{ kind: "text", text: "You're stuck now. Kidding: Esc closes this.", tone: "muted" }]);
        return;
      case "hi":
      case "hello":
        out([{ kind: "text", text: "Hey. `ssh contact` is the fastest way to reach me.", tone: "primary" }]);
        return;
      default:
        out([{ kind: "text", text: `command not found: ${cmd}. Try \`help\`.`, tone: "muted" }]);
    }
  }

  const KNOWN = new Set([
    "help", "whoami", "cd", "ls", "open", "cat", "ssh", "copy", "email", "mail", "curl", "ping",
    "uptime", "git", "clear", "exit", "q", ":q", "sudo", "rm", "coffee", "brew", "vim", "nano",
    "emacs", "hi", "hello",
  ]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!filtered.length) return;
      setNavigated(true);
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length);
    } else if (e.key === "Tab") {
      if (filtered[active]) {
        e.preventDefault();
        setInput(filtered[active].line);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const typedCmd = input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      const useSuggestion = filtered[active] && (navigated || !input.trim() || !KNOWN.has(typedCmd));
      void run(useSuggestion ? filtered[active].line : input);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-[640px] overflow-hidden rounded-xl border border-border bg-bg-elevated font-mono text-sm shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-text-tertiary">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                ~/portfolio
              </span>
              <button type="button" onClick={close} className="rounded border border-border px-1.5 py-0.5 hover:text-text-primary">
                esc
              </button>
            </div>

            <div ref={outputRef} className="max-h-[38vh] space-y-1 overflow-y-auto px-4 pt-3 text-[13px] leading-relaxed" aria-live="polite">
              {output.map((l, i) =>
                l.kind === "input" ? (
                  <p key={i} className="text-text-tertiary">
                    <span className="text-accent">$</span> <span className="text-text-primary">{l.text}</span>
                  </p>
                ) : l.kind === "link" ? (
                  <p key={i} className="truncate">
                    <a
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={(e) => {
                        if (l.external || l.href.startsWith("mailto:")) return;
                        e.preventDefault();
                        navigate(l.href);
                      }}
                      className="text-text-secondary underline decoration-dotted underline-offset-4 hover:text-accent"
                    >
                      {l.text}
                    </a>
                  </p>
                ) : (
                  <p
                    key={i}
                    className={`whitespace-pre-wrap break-words ${
                      l.tone === "accent"
                        ? "text-accent"
                        : l.tone === "primary"
                          ? "text-text-primary"
                          : l.tone === "muted"
                            ? "text-text-tertiary"
                            : "text-text-secondary"
                    }`}
                  >
                    {l.text}
                  </p>
                ),
              )}
            </div>

            <div className="flex items-center gap-2 px-4 py-3">
              <span className="hidden shrink-0 text-xs text-text-tertiary sm:inline">{PROMPT}</span>
              <span className="shrink-0 text-accent sm:hidden">$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={filtered.length > 0}
                aria-controls={listboxId}
                aria-activedescendant={filtered[active] ? `${listboxId}-${active}` : undefined}
                aria-autocomplete="list"
                aria-label="Command"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-text-primary caret-accent outline-none placeholder:text-text-tertiary focus-visible:outline-none"
                placeholder="help"
              />
            </div>

            <ul id={listboxId} role="listbox" className="border-t border-border p-1.5">
              {filtered.map((s, i) => (
                <li
                  key={s.line}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void run(s.line);
                  }}
                  className={`flex cursor-pointer items-baseline justify-between gap-4 rounded-md px-3 py-2 text-[13px] ${
                    i === active ? "bg-surface text-text-primary" : "text-text-secondary"
                  }`}
                >
                  <span className="shrink-0">
                    <span className={i === active ? "text-accent" : "text-text-tertiary"}>›</span> {s.line}
                  </span>
                  <span className="truncate text-xs text-text-tertiary">{s.description}</span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-text-tertiary">Enter to run · `help` lists commands</li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
