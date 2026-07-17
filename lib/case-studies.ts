export type CaseStudy = {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  stack: string[];
  // Maps this case study to a node in the architecture visualizer (Phase 4).
  nodeId: string | null;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "billing-concurrency",
    title: "Concurrency-safe subscription billing",
    excerpt:
      "Building a multi-tenant billing engine meant confronting a real race condition: two concurrent requests could both read the same usage quota before either wrote back, letting both through even when only one should've been allowed.",
    body: [
      "Building a multi-tenant billing engine meant confronting a real race condition: two concurrent requests could both read the same usage quota before either wrote back, letting both through even when only one should've been allowed.",
      "I moved usage tracking to a single atomic database update guarded by the remaining-quota condition, so the database enforces the invariant instead of application code racing against itself.",
      "Plan changes are versioned as snapshots taken at renewal, so switching plans mid-period never retroactively corrupts what a workspace already consumed.",
      "Quota, policy, and resource-lock violations return distinct, typed error responses instead of a generic failure, so clients can branch on what actually went wrong.",
    ],
    stack: ["Spring Boot", "PostgreSQL", "JPA"],
    nodeId: "database",
  },
  {
    slug: "module-boundary-fix",
    title: "Breaking circular module dependencies",
    excerpt:
      "An automated architecture test started flagging circular dependencies between domains that worked fine at runtime but broke the core promise of the system - that domains talk to each other through events, not direct calls.",
    body: [
      "As the backend grew, an automated architecture test started flagging circular dependencies between domains that worked fine at runtime but broke the core promise of the system - that domains talk to each other through events, not direct calls.",
      "I traced the tightest cycle to a synchronous cleanup step and moved it into an event listener that only runs after the triggering transaction commits, turning a two-way dependency into a one-way one.",
      "A couple of deeper cycles needed a stronger fix: introducing interfaces that let an upstream domain define a contract for something it needs, without ever depending on the domain that provides it.",
      "Along the way, I found the system was silently duplicating audit log entries because an event was being published to the message broker even though something in the same process already handled it.",
    ],
    stack: ["Spring Modulith", "Kafka", "Java"],
    nodeId: "queue",
  },
  {
    slug: "agent-code-review",
    title: "Reviewing agent-generated code before it reached users",
    excerpt:
      "An AI coding agent implemented a feature merging two related but different task types into one system. Reviewing it line-by-line against the actual permission and visibility rules surfaced 17 defects before release.",
    body: [
      "An AI coding agent implemented a feature merging two related but different task types into one system. Reviewing it line-by-line against the actual permission and visibility rules surfaced 17 defects before release.",
      "Among them: a missing configuration value that broke every endpoint for the new feature, a visibility check that could leak a task to the wrong user, notifications routed to the wrong recipient, and an N+1 query hiding in a background job.",
      "None of these would have shown up in a demo; they only show up when you read generated code as carefully as you'd read your own.",
    ],
    stack: ["Spring Boot", "Code review", "RBAC"],
    nodeId: "workers",
  },
  {
    slug: "s3-document-lifecycle",
    title: "Document storage lifecycle for a multi-tenant CRM",
    excerpt:
      "Built file upload, download, and secure temporary-link generation for a property management CRM, plus lifecycle management scoped to each project - so deleting a project actually cleans up its stored files.",
    body: [
      "Built file upload, download, and secure temporary-link generation for a property management CRM, plus lifecycle management scoped to each project - so deleting a project actually cleans up its stored files instead of leaving orphaned data billed indefinitely.",
      "Paired with a configurable report engine so different user roles see a different set of fields in generated documents, without needing a separate template per role.",
    ],
    stack: ["AWS S3", "Spring Boot", "React"],
    nodeId: "storage",
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}
