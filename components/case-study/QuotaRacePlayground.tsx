"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  MODES,
  QUOTA,
  raceWindow,
  simulateRace,
  usedAt,
  type RaceMode,
  type Segment,
  type Tone,
} from "@/lib/quota-race";

// Fixed time scale for the lanes (simulated ms), wide enough for the
// slowest schedule at the largest gap, so bars don't rescale while the
// slider moves.
const T_MAX = 480;
const GAP_MAX = 300;
const DEFAULT_GAP = 40;
// Real ms per simulated ms while playing - slow enough to follow the reads.
const SLOW_MO = 7;

const toneText: Record<Tone, string> = {
  neutral: "text-text-secondary",
  ok: "text-text-primary",
  bad: "text-accent",
};

// "Break it yourself": the billing case study's quota race as something to
// poke at rather than read about. Pick an implementation, set how far apart
// the two requests land, and watch both the timeline and the usage row.
// The schedule is computed up front by lib/quota-race.ts; this component
// only moves a playhead across it. Reduced motion: Run jumps to the end.
export function QuotaRacePlayground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<RaceMode>("read-check-write");
  const [gap, setGap] = useState(DEFAULT_GAP);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const result = useMemo(() => simulateRace(mode, gap), [mode, gap]);
  const done = t >= result.end;

  // Any change to the setup rewinds: the old playhead position means
  // nothing against a new schedule.
  useEffect(() => {
    setT(0);
    setPlaying(false);
  }, [mode, gap]);

  // The loop reads/writes the playhead through a ref (state updaters run
  // lazily, so they can't tell the loop when to stop).
  const tRef = useRef(0);
  tRef.current = t;
  useEffect(() => {
    if (!playing) return;
    const end = result.end;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(tRef.current + (now - last) / SLOW_MO, end);
      last = now;
      tRef.current = next;
      setT(next);
      if (next >= end) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, result.end]);

  function run() {
    if (prefersReducedMotion) {
      setT(result.end);
      return;
    }
    if (done) {
      tRef.current = 0;
      setT(0);
    }
    setPlaying(true);
  }

  // Jump to the next thing that happens: a log line or a phase boundary.
  function step() {
    setPlaying(false);
    const stops = [
      ...result.log.map((l) => l.t),
      ...result.segments.flatMap((s) => [s.start, s.end]),
    ]
      .filter((s) => s > t + 0.5)
      .sort((a, b) => a - b);
    setT(stops[0] ?? result.end);
  }

  function reset() {
    setPlaying(false);
    setT(0);
  }

  const used = usedAt(result.commits, t);
  const granted = result.log.filter((l) => l.grant && l.t <= t).length;
  const visibleLog = result.log.filter((l) => l.t <= t).sort((a, b) => a.t - b.t);
  const window = raceWindow(mode);
  const raceOn = mode !== "guarded-update" && gap < window;
  const bad = result.verdict.tone === "bad";

  return (
    <figure className="my-10 overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
        <span className="flex items-center gap-2 font-mono text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Break it yourself
        </span>
        <span className="font-mono text-xs text-text-tertiary">
          usage counter: count = 99, limit = {QUOTA} (one unit left)
        </span>
      </figcaption>

      <div className="space-y-6 p-5">
        {/* Implementation picker */}
        <div>
          <div
            role="radiogroup"
            aria-label="Implementation"
            className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3"
          >
            {MODES.map((m) => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-2.5 text-left font-mono text-xs transition-colors duration-200 ${
                    active
                      ? "bg-surface text-text-primary"
                      : "bg-bg-elevated text-text-tertiary hover:text-text-primary"
                  }`}
                >
                  <span className={active ? "text-accent" : undefined}>{active ? "● " : "○ "}</span>
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {MODES.find((m) => m.id === mode)?.caption}
          </p>
        </div>

        {/* Gap slider */}
        <div>
          <label htmlFor="race-gap" className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs">
            <span className="text-text-primary">
              B arrives <span className="text-accent">{gap} ms</span> after A
            </span>
            <span className="text-text-tertiary">
              {mode === "guarded-update"
                ? "no race window"
                : `race window: under ${window} ms`}
            </span>
          </label>
          <input
            id="race-gap"
            type="range"
            min={0}
            max={GAP_MAX}
            step={10}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-accent)]"
          />
        </div>

        {/* Lanes */}
        <div className="relative">
          <div className="space-y-2">
            {(["A", "B"] as const).map((lane) => (
              <div key={lane} className="grid grid-cols-[2.25rem_1fr] items-center gap-2">
                <span className="font-mono text-xs text-text-tertiary">Req {lane}</span>
                <div className="relative h-9 rounded-sm bg-bg">
                  {result.segments
                    .filter((s) => s.lane === lane)
                    .map((s, i) => (
                      <SegmentBar
                        key={`${s.kind}-${i}`}
                        segment={s}
                        t={t}
                        highlight={bad && lane === "B" && (s.kind === "write" || s.kind === "check")}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
          {/* Playhead */}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-[2.75rem]" aria-hidden="true">
            <div
              className="absolute inset-y-[-4px] w-px bg-accent"
              style={{ left: `${(t / T_MAX) * 100}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-[2.25rem_1fr] gap-2" aria-hidden="true">
            <span />
            <div className="relative h-4 font-mono text-[10px] text-text-tertiary">
              {[0, 100, 200, 300, 400].map((ms) => (
                <span key={ms} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: `${(ms / T_MAX) * 100}%` }}>
                  {ms}ms
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={playing}
            className="border border-text-primary px-4 py-2 font-mono text-xs text-text-primary transition-colors duration-200 hover:bg-text-primary hover:text-inverse-text disabled:opacity-50"
          >
            {done ? "↻ Send again" : "▶ Send both requests"}
          </button>
          <button
            type="button"
            onClick={step}
            disabled={done}
            className="border border-border px-4 py-2 font-mono text-xs text-text-secondary transition-colors duration-200 hover:border-text-primary hover:text-text-primary disabled:opacity-40"
          >
            Step →
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={t === 0}
            className="px-2 py-2 font-mono text-xs text-text-tertiary transition-colors duration-200 hover:text-text-primary disabled:opacity-40"
          >
            Reset
          </button>
          <span className="ml-auto font-mono text-xs text-text-tertiary">
            t = {Math.round(t)} ms
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          {/* The row itself */}
          <div className="rounded-md border border-border bg-bg p-4 font-mono text-xs">
            <p className="text-text-tertiary">workspace_usage_counters</p>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt className="text-text-tertiary">count</dt>
                <dd className={`text-2xl leading-none ${used > QUOTA ? "text-accent" : "text-text-primary"}`}>
                  {used}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-tertiary">limit</dt>
                <dd className="text-text-primary">{QUOTA}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-text-tertiary">requests allowed</dt>
                <dd className={granted > 1 ? "text-accent" : "text-text-primary"}>{granted}</dd>
              </div>
            </dl>
          </div>

          {/* Statement log */}
          <ol className="min-h-[9.5rem] space-y-1.5 rounded-md border border-border bg-bg p-4 font-mono text-[11px] leading-relaxed">
            {visibleLog.length === 0 && (
              <li className="text-text-tertiary">
                {raceOn
                  ? "// B will read before A commits. Press send."
                  : "// Press send, or step through it."}
              </li>
            )}
            {visibleLog.map((line, i) => (
              <li key={i} className="grid grid-cols-[3.25rem_1.5rem_1fr] gap-x-2">
                <span className="whitespace-pre text-text-tertiary">+{String(line.t).padStart(3, " ")}ms</span>
                <span className="text-text-tertiary">[{line.lane}]</span>
                <span className={`break-words ${toneText[line.tone]}`}>{line.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div aria-live="polite" className="min-h-[4.5rem]">
          {done && (
            <div
              className={`border-l-2 pl-4 ${
                result.verdict.tone === "bad"
                  ? "border-accent"
                  : result.verdict.tone === "ok"
                    ? "border-text-primary"
                    : "border-text-tertiary"
              }`}
            >
              <p className={`font-medium ${result.verdict.tone === "bad" ? "text-accent" : "text-text-primary"}`}>
                {result.verdict.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{result.verdict.body}</p>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}

function SegmentBar({
  segment: s,
  t,
  highlight,
}: {
  segment: Segment;
  t: number;
  highlight: boolean;
}) {
  const progress = Math.min(Math.max((t - s.start) / (s.end - s.start), 0), 1);
  // Only flag the bad step once the playhead reaches it - no spoilers.
  const flagged = highlight && progress > 0;
  const isWait = s.kind === "wait";
  const isReject = s.kind === "reject";
  const fill = flagged ? "bg-accent/30" : isReject ? "bg-text-primary/25" : "bg-text-primary/15";
  const border = flagged
    ? "border-accent"
    : isWait
      ? "border-dashed border-text-tertiary"
      : "border-border";

  return (
    <div
      className={`absolute inset-y-1 overflow-hidden rounded-sm border ${border}`}
      style={{
        left: `${(s.start / T_MAX) * 100}%`,
        width: `${((s.end - s.start) / T_MAX) * 100}%`,
      }}
      title={`${s.label}: ${s.start}–${s.end} ms`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${isWait ? "" : fill}`}
        style={{ width: `${progress * 100}%` }}
      />
      <span
        className={`relative flex h-full items-center justify-center truncate px-1 font-mono text-[10px] ${
          flagged ? "text-accent" : progress > 0 ? "text-text-primary" : "text-text-tertiary"
        }`}
      >
        {s.label}
      </span>
    </div>
  );
}
