export type ArchNode = {
  id: string;
  label: string;
  description: string;
  caseStudySlug: string | null;
};

// Same data feeds the Phase 1 static grid below and the Phase 4 3D visualizer
// (see docs/portfolio-prd-v1.md Section 9.1) - one source of truth either way.
export const architectureNodes: ArchNode[] = [
  { id: "api-layer", label: "API Layer", description: "REST endpoint design, request validation, typed error responses", caseStudySlug: "billing-concurrency" },
  { id: "app-server", label: "App Server", description: "Core application logic, multi-tenant request handling", caseStudySlug: null },
  { id: "queue", label: "Queue", description: "Event-driven processing, retry logic, decoupling slow work from the request path", caseStudySlug: "module-boundary-fix" },
  { id: "cache", label: "Cache", description: "Reducing read load on hot paths, cache invalidation strategy", caseStudySlug: null },
  { id: "database", label: "Database", description: "Schema design, concurrency-safe writes, query performance", caseStudySlug: "billing-concurrency" },
  { id: "storage", label: "Storage", description: "File/object storage lifecycle management", caseStudySlug: "s3-document-lifecycle" },
  { id: "workers", label: "Workers", description: "Background and scheduled processing", caseStudySlug: "agent-code-review" },
  { id: "monitoring", label: "Monitoring", description: "Audit logging, observability", caseStudySlug: null },
];
