"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { architectureFlows, type ArchFlow } from "@/lib/architecture-flows";

// Fixed per-step timing (spec Section 2.2): 900ms travel + 500ms hold before
// advancing, then a 600ms hold on the final "arrived" state before resetting
// to idle. All in ms, driven by a single interval-free rAF-friendly timer
// (setTimeout chain) — the 3D canvas reads elapsed-time-within-step itself
// via `stepStartTime` for the actual travel interpolation.
const STEP_TRAVEL_MS = 900;
const STEP_HOLD_MS = 500;
const STEP_TOTAL_MS = STEP_TRAVEL_MS + STEP_HOLD_MS;
const FINAL_HOLD_MS = 600;

export type PlaybackState = {
  activeFlowId: string | null;
  activeStepIndex: number | null; // index into the flow's steps array
  stepStartTime: number | null; // ms, from performance.now()
};

const idleState: PlaybackState = {
  activeFlowId: null,
  activeStepIndex: null,
  stepStartTime: null,
};

export function useFlowPlayback() {
  const [state, setState] = useState<PlaybackState>(idleState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setState(idleState);
  }, [clearTimer]);

  const play = useCallback(
    (flowId: string) => {
      const flow = architectureFlows.find((f) => f.id === flowId);
      if (!flow) return;
      clearTimer();

      const advance = (flow: ArchFlow, stepIndex: number) => {
        if (stepIndex >= flow.steps.length) {
          // Hold the final arrived state briefly, then reset to idle.
          timerRef.current = setTimeout(() => {
            setState(idleState);
          }, FINAL_HOLD_MS);
          return;
        }
        setState({
          activeFlowId: flow.id,
          activeStepIndex: stepIndex,
          stepStartTime: performance.now(),
        });
        timerRef.current = setTimeout(() => {
          advance(flow, stepIndex + 1);
        }, STEP_TOTAL_MS);
      };

      advance(flow, 0);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { state, play, stop };
}

export { STEP_TRAVEL_MS, STEP_HOLD_MS, STEP_TOTAL_MS };
