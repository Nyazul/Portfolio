"use client";

import { useEffect, useSyncExternalStore } from "react";

// One shared poller for /api/health, feeding both the footer's status panel
// and the hero's request-log line - two subscribers never mean two request
// streams. It only polls while at least one subscriber is on screen and
// the tab is visible, so an idle tab costs nothing.

export type HealthSample = {
  at: number;
  // Browser-measured round trip, ms.
  ms: number;
  ok: boolean;
  status: number;
};

export type HealthMeta = {
  commit: string | null;
  builtAt: string | null;
  region: string | null;
  instanceStartedAt: string;
};

export type HealthSnapshot = {
  samples: HealthSample[];
  meta: HealthMeta | null;
};

export const HEALTH_ENDPOINT = "/api/health";
export const POLL_INTERVAL_MS = 5000;
const MAX_SAMPLES = 30;
const TIMEOUT_MS = 4000;

const EMPTY: HealthSnapshot = { samples: [], meta: null };
let snapshot: HealthSnapshot = EMPTY;
const listeners = new Set<() => void>();
let activeSubscribers = 0;
let timer: number | null = null;
let inFlight = false;
let visibilityBound = false;

function emit(next: HealthSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

async function ping() {
  if (inFlight) return;
  inFlight = true;
  const controller = new AbortController();
  const abort = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = performance.now();
  let sample: HealthSample;
  let meta = snapshot.meta;
  try {
    const res = await fetch(HEALTH_ENDPOINT, { cache: "no-store", signal: controller.signal });
    const ms = performance.now() - start;
    sample = { at: Date.now(), ms, ok: res.ok, status: res.status };
    if (res.ok) meta = (await res.json()) as HealthMeta;
  } catch {
    sample = { at: Date.now(), ms: performance.now() - start, ok: false, status: 0 };
  } finally {
    window.clearTimeout(abort);
    inFlight = false;
  }
  emit({ samples: [...snapshot.samples, sample].slice(-MAX_SAMPLES), meta });
}

function shouldRun() {
  return activeSubscribers > 0 && document.visibilityState === "visible";
}

function stop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

function startIfNeeded() {
  if (!shouldRun() || timer !== null) return;
  const last = snapshot.samples.at(-1);
  if (!last || Date.now() - last.at > POLL_INTERVAL_MS) void ping();
  timer = window.setInterval(() => void ping(), POLL_INTERVAL_MS);
}

function onVisibility() {
  if (shouldRun()) startIfNeeded();
  else stop();
}

function acquire() {
  activeSubscribers++;
  if (!visibilityBound) {
    document.addEventListener("visibilitychange", onVisibility);
    visibilityBound = true;
  }
  startIfNeeded();
}

function release() {
  activeSubscribers = Math.max(0, activeSubscribers - 1);
  if (!shouldRun()) stop();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// `active` = this subscriber is on screen and wants live data. Inactive
// subscribers still read the latest snapshot, they just don't keep the
// poller running.
export function useHealth(active: boolean): HealthSnapshot {
  useEffect(() => {
    if (!active) return;
    acquire();
    return release;
  }, [active]);
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export function formatAgo(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (Number.isNaN(s)) return null;
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
