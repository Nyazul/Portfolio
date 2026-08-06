"use client";

import type { JSX } from "react";
import type { NodeVisual } from "@/lib/architecture-nodes";
import type { NodeVisualProps } from "./types";
import { Hub } from "./Hub";
import { Gateway } from "./Gateway";
import { Queue } from "./Queue";
import { Cache } from "./Cache";
import { Database } from "./Database";
import { Storage } from "./Storage";
import { Compute } from "./Compute";
import { Monitor } from "./Monitor";

// Replaces today's `if (node.isHub) ... else RoundedBox` branch (spec
// Section 5, file change map). Purely a lookup from data (`node.visual`) to
// component - no per-node visual decisions live here or in the caller.
const componentByVisual: Record<NodeVisual, (props: NodeVisualProps) => JSX.Element> = {
  hub: Hub,
  gateway: Gateway,
  queue: Queue,
  cache: Cache,
  database: Database,
  storage: Storage,
  compute: Compute,
  monitor: Monitor,
};

export function NodeVisualDispatcher(props: NodeVisualProps) {
  const Component = componentByVisual[props.node.visual];
  return <Component {...props} />;
}
