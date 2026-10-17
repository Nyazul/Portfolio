"use client";

import { useSyncExternalStore } from "react";

// "Intro may start" signal from <BootLoader/> to the hero: the hero's
// reveal animations wait for it so they play as the loader lifts instead of
// finishing unseen underneath it. Flips once and never back.
let ready = false;
const listeners = new Set<() => void>();

export function markIntroReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIntroReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready, () => false);
}
