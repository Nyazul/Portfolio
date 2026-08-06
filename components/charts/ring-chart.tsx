"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { cn } from "@/lib/utils";
import { DEFAULT_CHART_ENTER_TRANSITION } from "./animation";

export interface RingChartProps {
  /** Filled portion of the ring (e.g. active days). */
  value: number;
  /** Denominator the ring represents (e.g. total days) — must be > 0. */
  total: number;
  /** Primary value shown in the center. Defaults to `${value}`. */
  title?: ReactNode;
  /** Short label under the center value. */
  label?: string;
  /** Caption rendered below the ring. */
  caption?: string;
  /** Accessible label for the whole figure. */
  ariaLabel?: string;
  /** Outer diameter in px. Default 120. */
  size?: number;
  /** Ring stroke width in px. Default 10. */
  strokeWidth?: number;
  /** Track (unfilled) color. Defaults to the chart segment line token. */
  trackColor?: string;
  /** Progress color. Defaults to the chart line primary token. */
  progressColor?: string;
  /** Enter transition for the fill animation. */
  enterTransition?: Transition;
  className?: string;
}

/**
 * A self-contained, animated donut/ring chart. Unlike a raw progress bar it
 * shows a filled arc over a full track, which reads as a share of a whole —
 * well suited to honest ratios like "days active out of the past year".
 *
 * It deliberately takes a concrete `value`/`total` rather than a percentage:
 * the consuming code is responsible for the denominator meaning something real
 * (see StackMetrics, which derives it from GitHub's actual daily calendar), so
 * we never present a ring whose "out of what" was invented.
 */
export function RingChart({
  value,
  total,
  title,
  label,
  caption,
  ariaLabel,
  size = 120,
  strokeWidth = 10,
  trackColor = "var(--chart-segment-line)",
  progressColor = "var(--chart-line-primary)",
  enterTransition,
  className,
}: RingChartProps) {
  const reduceMotion = useReducedMotion();

  // Clamp the ratio to [0, 1]; a total of 0 just renders an empty track.
  const ratio = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ratio;
  const center = size / 2;
  const transition = enterTransition ?? DEFAULT_CHART_ENTER_TRANSITION;

  return (
    <figure
      aria-label={ariaLabel}
      className={cn("relative inline-flex flex-col items-center", className)}
      style={{ width: size }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${center} ${center})`}>
            {/* Full track (the "out of" backdrop). */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={trackColor}
              strokeWidth={strokeWidth}
            />
            {/* Filled arc, swept in on enter. */}
            {ratio > 0 && (
              <motion.circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={progressColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={reduceMotion ? false : { strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - dash }}
                transition={transition}
              />
            )}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-2xl leading-none text-text-primary">
            {title ?? value}
          </div>
          {label && (
            <div className="mt-1 text-xs text-text-tertiary">{label}</div>
          )}
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-text-tertiary">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default RingChart;
