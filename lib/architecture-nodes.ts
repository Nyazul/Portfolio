export type NodeVisual =
  | "hub" // app-server — icosahedron, unchanged
  | "gateway" // api-layer
  | "queue" // queue
  | "cache" // cache
  | "database" // database
  | "storage" // storage
  | "compute" // workers
  | "monitor"; // monitoring

export type ArchNode = {
  id: string;
  label: string;
  description: string;
  caseStudySlug: string | null;
  visual: NodeVisual;
};

// Same data feeds the Phase 1 static grid below and the Phase 4 3D visualizer
// (see docs/portfolio-prd-v1.md Section 9.1) - one source of truth either way.
export const architectureNodes: ArchNode[] = [
  { id: "api-layer", label: "API Layer", description: "REST endpoint design, request validation, typed error responses", caseStudySlug: "billing-concurrency", visual: "gateway" },
  { id: "app-server", label: "App Server", description: "Core application logic, multi-tenant request handling", caseStudySlug: null, visual: "hub" },
  { id: "queue", label: "Queue", description: "Event-driven processing, retry logic, decoupling slow work from the request path", caseStudySlug: "module-boundary-fix", visual: "queue" },
  { id: "cache", label: "Cache", description: "Reducing read load on hot paths, cache invalidation strategy", caseStudySlug: null, visual: "cache" },
  { id: "database", label: "Database", description: "Schema design, concurrency-safe writes, query performance", caseStudySlug: "billing-concurrency", visual: "database" },
  { id: "storage", label: "Storage", description: "File/object storage lifecycle management", caseStudySlug: "s3-document-lifecycle", visual: "storage" },
  { id: "workers", label: "Workers", description: "Background and scheduled processing", caseStudySlug: "agent-code-review", visual: "compute" },
  { id: "monitoring", label: "Monitoring", description: "Audit logging, observability", caseStudySlug: null, visual: "monitor" },
];
