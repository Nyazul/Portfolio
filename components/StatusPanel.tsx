"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { siteConfig } from "@/lib/site-config";
import {
  HEALTH_ENDPOINT,
  POLL_INTERVAL_MS,
  formatAgo,
  percentile,
  useHealth,
} from "@/lib/health";

const SPARK_W = 240;
const SPARK_H = 40;

// This site's own health, Grafana-panel style: browser-measured latency to
// /api/health, recent check results, and which build is answering. Every
// number is real and measured live - nothing here is a fixed figure. Only
// polls while the panel is on screen.
export function StatusPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "100px" });
  const { samples, meta } = useHealth(inView);

  // Re-render the relative times ("deployed 3h ago") while visible.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => setTick(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [inView]);

  const okLatencies = samples.filter((s) => s.ok).map((s) => s.ms);
  const p50 = percentile(okLatencies, 50);
  const p95 = percentile(okLatencies, 95);
  const okCount = samples.filter((s) => s.ok).length;
  const last = samples.at(-1);
  // Each new sample also advances the clock, so ages tick every poll.
  const now = Math.max(tick, last?.at ?? 0);
  const state = !last ? "pending" : last.ok ? "up" : "down";

  const commit = meta?.commit ?? null;
  const shortSha = commit ? commit.slice(0, 7) : null;
  const deployedAgo = formatAgo(meta?.builtAt ?? null, now);
  const instanceAge = formatAgo(meta?.instanceStartedAt ?? null, now);

  // Sparkline: fixed 30-slot x axis so new samples march in from the right.
  const maxMs = Math.max(100, ...samples.map((s) => s.ms));
  const slots = 30;
  const pts = samples.map((s, i) => {
    const x = ((slots - samples.length + i) / (slots - 1)) * SPARK_W;
    const y = SPARK_H - 3 - (Math.min(s.ms, maxMs) / maxMs) * (SPARK_H - 6);
    return { x, y, ok: s.ok };
  });

  return (
    <div
      ref={ref}
      id="status"
      className="mt-16 scroll-mt-28 overflow-hidden rounded-lg border border-border bg-bg-elevated font-mono text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-text-primary">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {state === "up" && (
              <span className="status-ping absolute inline-flex h-full w-full rounded-full bg-accent" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                state === "down" ? "bg-text-tertiary" : "bg-accent"
              }`}
            />
          </span>
          {state === "pending" ? "Checking this site…" : state === "up" ? "This site: operational" : "This site: not responding"}
        </span>
        <span className="text-text-tertiary">
          GET {HEALTH_ENDPOINT} · every {POLL_INTERVAL_MS / 1000}s
        </span>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="bg-bg-elevated p-4">
          <p className="text-text-tertiary">Latency from your browser</p>
          <svg
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            className="mt-3 h-10 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={
              p50 !== null ? `Recent latency, median ${Math.round(p50)} milliseconds` : "No latency samples yet"
            }
          >
            <line x1={0} x2={SPARK_W} y1={SPARK_H - 3} y2={SPARK_H - 3} stroke="var(--color-border)" strokeWidth={1} />
            {pts.length > 1 && (
              <polyline
                points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {pts
              .filter((p) => !p.ok)
              .map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--color-accent)" />
              ))}
          </svg>
        </div>
        <Stat label="p50 / p95" value={p50 !== null ? `${Math.round(p50)} / ${Math.round(p95!)} ms` : "—"} accent />
        <Stat label="Checks passed" value={samples.length ? `${okCount} / ${samples.length}` : "—"} />
        <Stat
          label="Build"
          value={
            shortSha ? (
              siteConfig.sourceRepo ? (
                <a
                  href={`${siteConfig.sourceRepo}/commit/${commit}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-4 transition-colors hover:text-accent"
                >
                  {shortSha}
                </a>
              ) : (
                shortSha
              )
            ) : (
              "—"
            )
          }
          sub={deployedAgo ? `built ${deployedAgo} ago` : undefined}
        />
        <Stat
          label="Instance"
          value={instanceAge ? `up ${instanceAge}` : "—"}
          sub={meta?.region ? `region ${meta.region}` : undefined}
        />
      </div>
      <p className="border-t border-border px-4 py-2.5 text-[11px] text-text-tertiary">
        Measured live while this panel is on screen. No stored or made-up numbers.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-bg-elevated p-4">
      <p className="text-text-tertiary">{label}</p>
      <p className={`mt-3 text-base ${accent ? "text-accent" : "text-text-primary"}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-text-tertiary">{sub}</p>}
    </div>
  );
}
