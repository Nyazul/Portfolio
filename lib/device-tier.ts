"use client";

import { useSyncExternalStore } from "react";

// Coarse hardware class used to scale the heavy visual systems (particle
// field, 3D visualizer, hero scroll blur). "high" gets the full treatment;
// "low" keeps every effect but runs a cheaper version of it. This is the
// starting guess only - the particle field and the 3D canvas also watch
// their own frame times and step down further if a "high" device can't
// actually keep up.
export type DeviceTier = "high" | "low";

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

let cached: DeviceTier | null = null;

export function getDeviceTier(): DeviceTier {
  if (cached) return cached;
  // ?perf=low / ?perf=high forces a tier, for checking the low path on a
  // fast machine (or ruling it out on a slow one).
  const forced = new URLSearchParams(window.location.search).get("perf");
  if (forced === "low" || forced === "high") return (cached = forced);

  const nav = navigator as NavigatorHints;
  const cores = nav.hardwareConcurrency ?? 4;
  // deviceMemory is Chromium-only and capped at 8; undefined elsewhere, so
  // it can only ever push a device down, never be required to stay up.
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData === true;

  cached = saveData || cores <= 4 || memory <= 4 ? "low" : "high";
  return cached;
}

const subscribe = () => () => {};

// Server render (and hydration) assume "low" - the cheaper choice - then
// the client upgrades in the same commit if the device qualifies.
export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(subscribe, getDeviceTier, () => "low");
}
