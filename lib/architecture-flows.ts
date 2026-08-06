export type FlowStep = {
  edgeFrom: string; // must match an existing node id
  edgeTo: string; // must match an existing node id
  caption: string; // 1-3 words, shown when packet arrives at edgeTo
};

// "signal"/"signal-dim" reuse the existing near-monochrome palette;
// "flow-request"/"flow-background" are two additional near-monochrome
// tokens (lib/design-tokens.json) added specifically so simultaneous/
// adjacent flows read as visually distinct paths without introducing any
// saturated color that would compete with the site's restrained aesthetic
// or with the existing signal/signal-dim highlight semantics.
export type FlowColorToken =
  | "signal"
  | "signal-dim"
  | "flow-request"
  | "flow-background";

export type ArchFlow = {
  id: string;
  label: string; // shown on the toggle chip, e.g. "Request path"
  colorToken: FlowColorToken;
  steps: FlowStep[];
};

export const architectureFlows: ArchFlow[] = [
  {
    id: "request",
    label: "Request path",
    colorToken: "flow-request",
    steps: [
      { edgeFrom: "api-layer", edgeTo: "app-server", caption: "Validating" },
      { edgeFrom: "app-server", edgeTo: "cache", caption: "Cache check" },
      { edgeFrom: "app-server", edgeTo: "database", caption: "Query" },
    ],
  },
  {
    id: "background-job",
    label: "Background job",
    colorToken: "flow-background",
    steps: [
      { edgeFrom: "app-server", edgeTo: "queue", caption: "Enqueued" },
      { edgeFrom: "queue", edgeTo: "workers", caption: "Picked up" },
      { edgeFrom: "workers", edgeTo: "monitoring", caption: "Logged" },
    ],
  },
  {
    id: "storage-write",
    label: "Storage write",
    colorToken: "signal-dim",
    steps: [
      { edgeFrom: "app-server", edgeTo: "storage", caption: "Writing" },
      { edgeFrom: "workers", edgeTo: "monitoring", caption: "Confirmed" },
    ],
  },
];
