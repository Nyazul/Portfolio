"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { HEALTH_ENDPOINT, useHealth } from "@/lib/health";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// One live access-log line in the hero: the latest real request this page
// made to /api/health, refreshed every poll. Shares the footer status
// panel's poller (lib/health.ts) and links down to it.
export function HeroRequestLog({ delay = 0 }: { delay?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const inView = useInView(ref);
  const { samples, meta } = useHealth(inView);
  const prefersReducedMotion = usePrefersReducedMotion();
  const last = samples.at(-1);

  return (
    <motion.a
      ref={ref}
      href="#status"
      aria-label="Live health check of this site. Jump to the status panel."
      className="group mt-8 inline-flex max-w-full items-center gap-3 overflow-hidden font-mono text-xs text-text-tertiary transition-colors hover:text-text-primary"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay }}
    >
      <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide group-hover:border-accent group-hover:text-accent">
        live
      </span>
      <span className="relative h-4 min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={last?.at ?? "pending"}
            className="block truncate"
            initial={prefersReducedMotion ? false : { y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { y: "-100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            GET {HEALTH_ENDPOINT}{" "}
            {!last ? (
              "…"
            ) : last.ok ? (
              <>
                <span className="text-text-primary">{last.status}</span>{" "}
                <span className="text-accent">{Math.round(last.ms)}ms</span>
                {meta?.region ? ` · ${meta.region}` : ""}
                {meta?.commit ? ` · ${meta.commit.slice(0, 7)}` : ""}
              </>
            ) : (
              <span className="text-accent">{last.status || "ERR"}</span>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.a>
  );
}
