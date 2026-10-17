"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { siteConfig } from "@/lib/site-config";
import { markIntroReady } from "@/lib/intro";
import { BOOT_SEEN_KEY } from "@/lib/boot";
import { HEALTH_ENDPOINT, useHealth } from "@/lib/health";

// Never shorter than this (so it reads as intentional, not a flash), never
// longer than MAX_MS whatever the network does.
const MIN_MS = 1100;
const MAX_MS = 2600;
const EXIT_DELAY_MS = 250;
// Timer-based backstop (unlike the rAF loop, timers still fire if frames
// stall): always lift the loader and release the hero intro by then, so a
// stuck loop can never leave the page covered or the hero name hidden.
const FAILSAFE_MS = MAX_MS + 1500;

type Line = { key: string; text: string; detail?: string };

// First-visit page loader, developer-flavoured: a boot log over a giant
// percentage counter, then the whole panel lifts away like a curtain.
// Every log line reports something that really happened on this load
// (document received, fonts ready, React hydrated, a live health check) -
// nothing is a canned "loading modules…" string.
//
// Shown once per browser session, never under reduced motion. The decision
// is made before first paint by the inline script in app/layout.tsx (it sets
// html[data-boot="skip"], which hides the panel in CSS), so repeat visits
// never flash it. A CSS failsafe hides it after 5s even if JS never runs.
export function BootLoader() {
  const [phase, setPhase] = useState<"boot" | "exit" | "done">("boot");
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const { samples } = useHealth(phase === "boot");
  const healthLogged = useRef(false);

  // Log the first health check if it lands while the loader is up.
  const first = samples[0];
  useEffect(() => {
    if (!first || healthLogged.current || phase !== "boot") return;
    healthLogged.current = true;
    setLines((l) => [
      ...l.filter((x) => x.key !== "health"),
      {
        key: "health",
        text: `GET ${HEALTH_ENDPOINT}`,
        detail: first.ok ? `${first.status} · ${Math.round(first.ms)}ms` : "unreachable",
      },
    ]);
  }, [first, phase]);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.boot === "skip") {
      setPhase("done");
      markIntroReady();
      return;
    }
    try {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    } catch {
      // Storage blocked: the loader just shows again next visit.
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const start = performance.now();
    // Keyed and guarded: dev Strict Mode runs this effect twice, and the
    // fonts promise can resolve after cleanup.
    let cancelled = false;
    const add = (line: Line) => {
      if (cancelled) return;
      setLines((l) => (l.some((x) => x.key === line.key) ? l : [...l, line]));
    };

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.responseEnd) {
      add({ key: "doc", text: "document received", detail: `${Math.round(nav.responseEnd)}ms` });
    }
    add({ key: "hydrate", text: "react hydrated", detail: `${Math.round(start)}ms` });

    let fontsReady = false;
    let loaded = document.readyState === "complete";
    document.fonts?.ready.then(() => {
      fontsReady = true;
      add({ key: "fonts", text: "fonts ready", detail: "Inter · JetBrains Mono" });
    });
    const onLoad = () => {
      loaded = true;
    };
    window.addEventListener("load", onLoad, { once: true });

    let shown = 0;
    let raf = 0;
    let exitTimer = 0;
    const failsafe = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      setPhase("exit");
      markIntroReady();
    }, FAILSAFE_MS);
    const tick = () => {
      const elapsed = performance.now() - start;
      const forced = elapsed >= MAX_MS;
      // Time drives the counter, but it parks below 100 until the real
      // milestones are in, so the number never claims more than happened.
      let target = Math.min(100, (elapsed / MIN_MS) * 100);
      if (!forced && !fontsReady) target = Math.min(target, 72);
      if (!forced && !loaded) target = Math.min(target, 91);
      shown += (target - shown) * 0.14;
      if (target >= 100 && shown > 99.4) shown = 100;
      setProgress(shown);

      if (shown >= 100) {
        add({ key: "ready", text: "ready", detail: `${(elapsed / 1000).toFixed(2)}s` });
        window.clearTimeout(failsafe);
        exitTimer = window.setTimeout(() => {
          setPhase("exit");
          markIntroReady();
        }, EXIT_DELAY_MS);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      window.clearTimeout(exitTimer);
      window.removeEventListener("load", onLoad);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Release scroll as soon as the curtain starts lifting.
  useEffect(() => {
    if (phase !== "boot") document.body.style.overflow = "";
  }, [phase]);

  if (phase === "done") return null;

  const pct = Math.floor(progress);

  return (
    <AnimatePresence onExitComplete={() => setPhase("done")}>
      {phase === "boot" && (
        <motion.div
          id="boot-loader"
          key="boot"
          role="status"
          aria-live="polite"
          aria-label={`Loading ${pct}%`}
          className="fixed inset-0 z-[200] flex flex-col justify-between bg-[#0A0A0A] px-6 py-8 font-mono text-[#F5F5F5] md:px-10 md:py-10"
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="space-y-1.5 text-xs md:text-sm">
            <p className="text-[#6B6B6B]">
              <span className="text-[#FF6B2C]">nyazul@portfolio</span>:~$ ./boot.sh
            </p>
            {lines.map((line) => (
              <p key={line.key} className="flex gap-3">
                <span className="text-[#FF6B2C]">[ ok ]</span>
                <span className="text-[#A3A3A3]">{line.text}</span>
                {line.detail && <span className="text-[#6B6B6B]">{line.detail}</span>}
              </p>
            ))}
            {pct < 100 && (
              <p className="text-[#6B6B6B]">
                <span className="boot-caret inline-block h-3.5 w-2 translate-y-0.5 bg-[#F5F5F5]" />
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="pb-2 text-xs text-[#6B6B6B] md:text-sm">
              <p className="text-[#F5F5F5]">{siteConfig.name}</p>
              <p>{siteConfig.role}</p>
            </div>
            <p className="text-[clamp(5rem,22vw,20rem)] leading-[0.8] font-medium tracking-tighter tabular-nums">
              {String(pct).padStart(3, "0")}
              <span className="text-[0.25em] text-[#FF6B2C]">%</span>
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1A1A1A]" aria-hidden="true">
            <div className="h-full bg-[#FF6B2C]" style={{ width: `${progress}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
