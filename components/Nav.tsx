"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "@/components/CommandPalette";
import { MagneticHover } from "@/components/motion/MagneticHover";
import { useActiveSection } from "@/lib/hooks/use-active-section";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// Module-level (not inside the component) so the reference is stable across
// renders - see useActiveSection's contract on why that matters.
const links = [
  { href: "/#about", label: "About" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/#work", label: "Work" },
  { href: "/#stack", label: "Stack" },
  { href: "/#principles", label: "Principles" },
  { href: "/#experience", label: "Experience" },
  { href: "/#contact", label: "Contact" },
];
// Hrefs are root-relative ("/#about", not "#about") so they still work from
// /work/* pages, where a bare hash would point at an anchor that isn't there.
const sectionId = (href: string) => href.slice(2);
const sectionIds = links.map((link) => sectionId(link.href));

// Px of scroll before the pill compacts. Matches the pill's own top offset
// (top-4 = 16px, top-6 = 24px on md+) so the transition lands right around
// when the pill would otherwise start crowding the viewport edge.
const COMPACT_SCROLL_THRESHOLD = 24;

// How the reference site (austinmakasare.site) actually compacts its pill,
// confirmed by inspecting its live DOM: the pill's own width is never
// tweened directly. Instead the nav-links wrapper - and only that wrapper -
// animates width 216px->0, opacity 1->0, with overflow:hidden and
// aria-hidden toggled. The logo and CTA are flex-shrink:0 and stay put; the
// pill's overall width just falls out naturally as its content collapses.
// We reproduce that with a CSS grid-template-columns 1fr->0fr trick instead
// of a JS-measured pixel width, so it works for any label set without
// hardcoding a width.

export function Nav() {
  // isScrolled tracks how far the user has scrolled; isHovering lets a mouse
  // hover override the compact state so the links re-expand (and the collapsible
  // section's aria-hidden flips back to false) while the pointer is over the pill.
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const activeId = useActiveSection(sectionIds);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Shortcut hint for the command palette: ⌘ on Apple devices, Ctrl
  // elsewhere. Starts as ⌘ on the server and corrects after mount.
  const [modKey, setModKey] = useState("⌘");
  useEffect(() => {
    if (!/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) setModKey("Ctrl ");
  }, []);
  const openPalette = () => {
    setIsMobileOpen(false);
    window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
  };

  // useMotionValueEvent instead of a scroll listener + setState-per-pixel:
  // scrollY updates on every scroll tick without triggering a React render,
  // and this callback only calls setState when the *boolean* actually
  // flips - so the component re-renders twice total per scroll session
  // (compact on, compact off), not once per pixel.
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > COMPACT_SCROLL_THRESHOLD);
  });

  // The pill is only compact when scrolled AND the pointer isn't hovering it.
  // Hovering re-expands the middle links, which also flips that section's
  // aria-hidden from true to false. Derived here so every consumer (grid
  // classes, opacity, aria-hidden, tabIndex) stays in sync with a single
  // source of truth.
  const isCompact = isScrolled && !isHovering;

  // Lock background scroll while the mobile panel is open. Always restore
  // the previous inline value on cleanup rather than hardcoding "" - if
  // some other effect ever sets body.style.overflow, this won't clobber it.
  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  // Escape closes the panel regardless of focus location inside it.
  useEffect(() => {
    if (!isMobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 [view-transition-name:site-nav] md:top-6 md:px-6">
      {/* flex-col + items-center, not mx-auto on a fixed max-width block:
          the nav itself needs to size to its own content (a real floating
          pill, width: fit-content) so that collapsing the middle links
          actually shrinks the pill. A block-level nav inside a max-w-4xl
          wrapper stretches full width and justify-between just redistributes
          the freed space instead of visibly contracting anything - that was
          the bug behind "the pill isn't contracting." */}
      <div className="flex flex-col items-center">
        <nav
          aria-label="Primary"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={`inline-flex max-w-[calc(100vw-2rem)] items-center justify-between rounded-full border border-border bg-black shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-[padding,transform] duration-300 ease-[var(--ease-standard)] ${
            isCompact ? "scale-[0.98] px-4 py-2 md:px-5" : "scale-100 px-5 py-3 md:px-6 md:py-3.5"
          }`}
        >
          <Link
            href="/#top"
            onClick={() => setIsMobileOpen(false)}
            className="mr-5 shrink-0 font-mono text-sm font-bold tracking-tight text-text-primary"
          >
            NA
          </Link>

          {/* Collapsing middle section, matching the reference site's
              mechanism: a grid track that tweens 1fr -> 0fr with
              overflow-hidden clips the links out of view (rather than
              scaling the whole pill or the links' own padding). min-w-0 on
              the inner ul lets it actually shrink past its content width -
              without it, grid-cols-[0fr] has nothing to collapse against. */}
          <div
            aria-hidden={isCompact}
            className={`hidden overflow-hidden transition-[grid-template-columns,opacity] duration-300 ease-[var(--ease-standard)] md:grid ${
              isCompact ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100"
            }`}
          >
            <ul className="flex min-w-0 items-center gap-1 text-sm">
              {links.map((link) => {
                const isActive = activeId === sectionId(link.href);
                return (
                  <li key={link.href} className="shrink-0">
                    <MagneticHover strength={8}>
                      <Link
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        tabIndex={isCompact ? -1 : undefined}
                        className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 lg:px-3 transition-colors duration-200 ${
                          isActive
                            ? "bg-surface text-text-primary"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-accent"
                          />
                        )}
                        {link.label}
                      </Link>
                    </MagneticHover>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette"
              data-cursor="Terminal"
              className="hidden shrink-0 items-center rounded-full border border-border px-2.5 py-1 font-mono text-xs text-text-tertiary transition-colors duration-200 hover:border-text-primary hover:text-text-primary lg:inline-flex"
            >
              <kbd className="font-mono">{modKey}K</kbd>
            </button>
            <MagneticHover strength={8} className="hidden md:block">
              <a
                href="/Nyazul_Ansari_Resume.pdf"
                className="block rounded-full bg-inverse-bg px-4 py-1.5 text-sm text-inverse-text transition-opacity duration-200 hover:opacity-90"
              >
                Résumé
              </a>
            </MagneticHover>

            <button
              type="button"
              onClick={() => setIsMobileOpen((open) => !open)}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-nav-panel"
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
              className="rounded-full p-2 text-text-primary transition-colors duration-200 hover:bg-surface md:hidden"
            >
              {isMobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              id="mobile-nav-panel"
              role="menu"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-1 rounded-2xl border border-border bg-bg-elevated/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md md:hidden"
            >
              {links.map((link) => {
                const isActive = activeId === sectionId(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsMobileOpen(false)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
                      isActive
                        ? "bg-surface text-text-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <button
                type="button"
                role="menuitem"
                onClick={openPalette}
                className="rounded-full px-4 py-2 text-left font-mono text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
              >
                <span className="text-accent">$</span> terminal
              </button>
              <a
                href="/Nyazul_Ansari_Resume.pdf"
                role="menuitem"
                onClick={() => setIsMobileOpen(false)}
                className="mt-1 rounded-full bg-inverse-bg px-4 py-2 text-center text-sm text-inverse-text"
              >
                Résumé
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
