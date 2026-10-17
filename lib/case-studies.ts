// Any string starting with this marker is a fact only Nyazul can supply
// (a real number, a date). It renders as a visible dashed placeholder in dev
// and is dropped entirely in production - see isFilled() below - so an
// unfilled TODO can never ship as a fake-looking value.
export const TODO = "TODO(nyazul)";

export function isFilled(value: string | undefined): value is string {
  return !!value && !value.startsWith(TODO);
}

export type CodeSample = {
  lang: "java" | "sql" | "yaml";
  caption: string;
  snippet: string;
};

export type ApproachStep = {
  heading: string;
  body: string[];
  code?: CodeSample;
  // Small labelled cards rendered as a grid under the body.
  callouts?: { label: string; body: string }[];
  // Named inline diagram, rendered by the case-study page.
  diagram?: "race-timeline";
};

export type CaseStudy = {
  slug: string;
  title: string;
  excerpt: string;
  role: string;
  timeframe: string;
  stack: string[];
  keyFacts: { label: string; value: string }[];
  problem: string[];
  approach: ApproachStep[];
  outcome: string[];
  lessons?: string[];
  // Maps this case study to a node in the architecture visualizer (Phase 4).
  nodeId: string | null;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "billing-concurrency",
    title: "Concurrency-safe subscription billing",
    excerpt:
      "Two concurrent requests could both read the same usage quota before either wrote back, letting both through when only one should have been allowed. The fix: make the database enforce the invariant.",
    role: "Backend engineer",
    timeframe: "2025",
    stack: ["Spring Boot", "PostgreSQL", "JPA"],
    keyFacts: [
      { label: "Statements to enforce quota", value: "1" },
      { label: "Typed violation responses", value: "3" },
      { label: "Concurrent requests load-tested", value: `${TODO}: e.g. 500` },
    ],
    problem: [
      "The multi-tenant workspace platform bills on usage: each plan grants a quota per metric, and every metered action has to check that quota before it's allowed through.",
      "The first implementation did the obvious thing: read the usage row, compare it against the quota in Java, then write the incremented value back. That's correct when requests arrive one at a time, which is exactly how they arrive in a demo.",
      "Under concurrency it isn't. Two requests can both read the same 'one unit left' state before either writes, both pass the check, and both increment. The workspace ends up over quota with no error anywhere, and nothing in the logs says anything went wrong.",
    ],
    approach: [
      {
        heading: "See the race clearly",
        body: [
          "Check-then-act across two statements leaves a window between the read and the write. Any request that lands inside that window sees stale state. Adding locks in application code would only move the window around. The real fix is to remove it.",
        ],
        diagram: "race-timeline",
        code: {
          lang: "java",
          caption: "Before (simplified): the check and the write are separate steps",
          snippet: `WorkspaceUsage usage = usageRepository.find(workspaceId, metric);

if (usage.getUsed() + amount > usage.getQuota()) {
    throw new QuotaExceededException(workspaceId, metric);
}

// Two requests can both reach this line with the same 'used' value.
usage.setUsed(usage.getUsed() + amount);`,
        },
      },
      {
        heading: "Let the database enforce the invariant",
        body: [
          "Usage tracking became a single conditional UPDATE. The quota check moved into the WHERE clause, so the row changes only if there is room for the increment. Row-level locking inside PostgreSQL serializes the competing writes, and the loser's condition is re-evaluated against the committed value.",
          "The application no longer decides whether the quota allows the action. It asks the database to do the increment and reads the affected-row count: 1 means allowed, 0 means rejected.",
        ],
        code: {
          lang: "java",
          caption: "After (simplified): one atomic, guarded statement",
          snippet: `@Modifying
@Query("""
    UPDATE WorkspaceUsage u
       SET u.used = u.used + :amount
     WHERE u.workspaceId = :workspaceId
       AND u.metric      = :metric
       AND u.used + :amount <= u.quota
    """)
int tryConsume(UUID workspaceId, Metric metric, long amount);

// Caller: zero rows updated means the quota said no.
if (usageRepository.tryConsume(workspaceId, metric, amount) == 0) {
    throw new QuotaExceededException(workspaceId, metric);
}`,
        },
      },
      {
        heading: "Version plans as snapshots",
        body: [
          "Plan changes are versioned. At each renewal the workspace takes a snapshot of its plan template, and usage for that period is measured against the snapshot. Switching plans mid-period can't rewrite what the workspace already consumed under the old terms.",
        ],
      },
      {
        heading: "Make failures specific",
        body: [
          "A generic 'request failed' gives a client nothing to branch on. Quota, policy and resource-lock violations each return their own typed error response, so the frontend can show an upgrade prompt, a permissions message or a retry hint as appropriate.",
        ],
        callouts: [
          { label: "Quota exceeded", body: "The plan's limit for this metric is used up this period." },
          { label: "Policy violation", body: "The plan doesn't include this capability at all." },
          { label: "Resource locked", body: "Another operation holds the resource; safe to retry." },
        ],
      },
    ],
    outcome: [
      "The over-quota race is closed by construction rather than by timing. No interleaving of requests can push usage past the quota, because the only write path re-checks the limit atomically.",
      "The billing code got smaller too: the read-compare-write dance, and the defensive checks around it, collapsed into one statement and one branch.",
    ],
    lessons: [
      "If an invariant matters, put it where every write path has to pass through it. Usually that's the database, not a service method.",
      "Code that is 'correct' one request at a time is a hypothesis. Concurrency is the test.",
    ],
    nodeId: "database",
  },
  {
    slug: "module-boundary-fix",
    title: "Breaking circular module dependencies",
    excerpt:
      "An architecture test started flagging circular dependencies between domains. They worked fine at runtime but broke the system's core promise: domains talk through events, not direct calls.",
    role: "Backend engineer",
    timeframe: "2025",
    stack: ["Spring Modulith", "Kafka", "Java"],
    keyFacts: [
      { label: "Module cycles flagged", value: `${TODO}: e.g. 4` },
      { label: "Cycles remaining", value: "0" },
      { label: "Duplicate audit writes after fix", value: "0" },
    ],
    problem: [
      "The backend is a modular monolith built on Spring Modulith. Each domain (workspaces, tasks, billing, automation) is a module, and the rule is that modules communicate through events. One domain never reaches directly into another's internals.",
      "As the codebase grew, the automated module-structure test started failing on circular dependencies. Nothing was broken at runtime: every request still worked. But each cycle meant two domains could no longer change, test or eventually be extracted independently.",
    ],
    approach: [
      {
        heading: "Make the architecture executable",
        body: [
          "The cycles were only caught because the module rules are verified on every build rather than written in a wiki. That test is what turned a slow, invisible erosion into a red build that someone had to deal with.",
        ],
        code: {
          lang: "java",
          caption: "The test that caught it",
          snippet: `@Test
void verifiesModularStructure() {
    ApplicationModules.of(Application.class).verify();
}`,
        },
      },
      {
        heading: "Turn a synchronous call into an after-commit event",
        body: [
          "The tightest cycle came from a synchronous cleanup step: deleting a workspace called directly into another module to clean up its data, and that module already depended back on workspaces.",
          "I moved the cleanup into an event listener that runs only after the triggering transaction commits. The workspace module now just publishes the fact that a workspace was deleted. It no longer knows or cares who reacts, and the dependency points one way.",
        ],
        code: {
          lang: "java",
          caption: "Simplified: the downstream module reacts after commit",
          snippet: `// @ApplicationModuleListener = @TransactionalEventListener(AFTER_COMMIT)
//                            + @Async + @Transactional(REQUIRES_NEW)
@ApplicationModuleListener
void on(WorkspaceDeleted event) {
    taskCleanup.purgeFor(event.workspaceId());
}`,
        },
      },
      {
        heading: "Invert the deeper cycles with owned contracts",
        body: [
          "A couple of cycles couldn't be solved with events, because the upstream domain genuinely needed an answer back. For those, the upstream module defines an interface for what it needs and exposes it as a named interface. The downstream module implements it, and upstream never imports a single downstream type.",
        ],
        code: {
          lang: "java",
          caption: "Simplified: upstream owns the contract, downstream fulfils it",
          snippet: `// In the upstream module, exposed as a named interface.
@NamedInterface("spi")
public interface MemberDirectory {
    Optional<MemberRef> find(UUID memberId);
}

// In the downstream module - depends on upstream, never the reverse.
@Component
class MemberDirectoryAdapter implements MemberDirectory { /* ... */ }`,
        },
      },
      {
        heading: "Find the bug hiding next to the cycle",
        body: [
          "While tracing events I noticed audit log entries were silently duplicated. One event was handled in-process by the audit listener and also externalized to Kafka, where a consumer wrote the same entry again. Two correct handlers added up to one incorrect result. Externalization was removed for events that already have an in-process consumer.",
        ],
      },
    ],
    outcome: [
      "The module-structure test is green and stays green, so each domain can again be reasoned about, tested and changed on its own.",
      "Audit logs record each action once, which matters for a log whose whole purpose is to be trusted.",
    ],
    lessons: [
      "Architecture rules that aren't executed are suggestions. Make the build enforce them.",
      "When an event crosses a process boundary, ask who else already handles it in-process.",
    ],
    nodeId: "queue",
  },
  {
    slug: "agent-code-review",
    title: "Reviewing agent-generated code before it reached users",
    excerpt:
      "An AI coding agent merged two related but different task types into one system. Reading its output line by line against the real permission and visibility rules surfaced 17 defects before release.",
    role: "Reviewer & backend engineer",
    timeframe: `${TODO}: e.g. 2025`,
    stack: ["Spring Boot", "Code review", "RBAC"],
    keyFacts: [
      { label: "Defects caught before release", value: "17" },
      { label: "Reached production", value: "0" },
    ],
    problem: [
      "An AI coding agent implemented a feature that unified two task types. They looked similar but carried different permission and visibility rules. The generated code compiled, the happy path worked, and a demo would have looked finished.",
      "The risk was in exactly the places a demo never visits: who can see a task, who gets notified about it, what happens when a config value is missing, and how a background job behaves with real data volumes.",
    ],
    approach: [
      {
        heading: "Review against the rules, not against the diff",
        body: [
          "Instead of skimming for style, I walked the generated code path by path against the actual authorization and visibility model: for each endpoint, who should be allowed, who should see the result, and who should hear about it. Reviewed that way, 17 defects surfaced before release.",
        ],
        callouts: [
          { label: "Configuration", body: "A missing configuration value broke every endpoint for the new feature." },
          { label: "Visibility", body: "A visibility check that could leak a task to the wrong user." },
          { label: "Notifications", body: "Notifications routed to the wrong recipient." },
          { label: "Performance", body: "An N+1 query hiding inside a background job." },
        ],
      },
      {
        heading: "Example: the N+1 in a background job",
        body: [
          "Background jobs are where N+1 queries hide best. Nobody watches their latency, and they look fine with ten rows in a dev database.",
        ],
        code: {
          lang: "java",
          caption: "Simplified: one round trip instead of one per task",
          snippet: `// Before: a query per task, inside a scheduled job.
for (Task task : dueTasks) {
    User assignee = userRepository.findById(task.getAssigneeId()).orElseThrow();
    notifier.remind(assignee, task);
}

// After: fetch tasks and their assignees together.
@Query("select t from Task t join fetch t.assignee where t.dueAt < :now")
List<Task> findDueWithAssignee(Instant now);`,
        },
      },
    ],
    outcome: [
      "All 17 defects were fixed before release. The ones that mattered most (the visibility leak and misrouted notifications) would never have shown up in a demo, and would only have been reported by the wrong user seeing the wrong thing.",
    ],
    lessons: [
      "Generated code deserves the same line-by-line reading you'd give your own, and probably more, because nobody has a mental model of why each line is there.",
      "Review against the domain's rules (permissions, visibility, routing), not just against whether the code compiles and the tests pass.",
    ],
    nodeId: "workers",
  },
  {
    slug: "s3-document-lifecycle",
    title: "Document storage lifecycle for a multi-tenant CRM",
    excerpt:
      "File upload, download and secure temporary links for a property-management CRM, with storage scoped to each project. Deleting a project actually cleans up its stored files.",
    role: "Software engineering intern",
    timeframe: "2025",
    stack: ["AWS S3", "Spring Boot", "React"],
    keyFacts: [
      { label: "Entities in the CRM", value: "15" },
      { label: "Orphaned files after project delete", value: "0" },
      { label: "Templates per role", value: "1 shared" },
    ],
    problem: [
      "The CRM stores documents for each property project: agreements, IDs, receipts. Users need to upload, download and share them without the bucket ever being public.",
      "The quiet failure mode in object storage is orphaned data. When a project is deleted, its database rows disappear but its files don't. Nobody notices, because nothing references them anymore, and they keep getting billed indefinitely.",
    ],
    approach: [
      {
        heading: "Short-lived links instead of a public bucket",
        body: [
          "Downloads and shares go through presigned URLs scoped to a single object and valid only briefly. The bucket stays private, and access control stays in the application, where the permission model lives.",
        ],
        code: {
          lang: "java",
          caption: "Simplified: a single-object, time-boxed download link",
          snippet: `PresignedGetObjectRequest link = presigner.presignGetObject(r -> r
    .signatureDuration(Duration.ofMinutes(10))
    .getObjectRequest(g -> g
        .bucket(bucket)
        .key(keyFor(projectId, fileId))));`,
        },
      },
      {
        heading: "Scope every object to its project",
        body: [
          "Every object key is prefixed with its project. That one convention makes lifecycle management tractable: deleting a project can remove exactly its files, nothing more and nothing left behind. Cleanup runs after the delete commits, so a rolled-back delete never loses files.",
        ],
        code: {
          lang: "java",
          caption: "Simplified: project-scoped keys and after-commit cleanup",
          snippet: `String keyFor(UUID projectId, UUID fileId) {
    return "projects/%s/%s".formatted(projectId, fileId);
}

@TransactionalEventListener(phase = AFTER_COMMIT)
void on(ProjectDeleted event) {
    storage.deletePrefix("projects/" + event.projectId() + "/");
}`,
        },
      },
      {
        heading: "One report template, many roles",
        body: [
          "The feature was paired with a configurable report engine. Different roles see a different set of fields in generated documents, driven by configuration rather than a separate template per role.",
        ],
      },
    ],
    outcome: [
      "Documents are private by default and shareable on demand, and deleting a project now cleans up its storage instead of leaving it to accumulate cost.",
    ],
    lessons: [
      "Anything you create, you're responsible for deleting. Design the cleanup path at the same time as the create path.",
      "A good key naming convention is a cheap form of data modelling.",
    ],
    nodeId: "storage",
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}

// Neighbours for the prev/next footer, wrapping around at the ends.
export function getAdjacentCaseStudies(slug: string) {
  const i = caseStudies.findIndex((c) => c.slug === slug);
  const n = caseStudies.length;
  return {
    prev: caseStudies[(i - 1 + n) % n],
    next: caseStudies[(i + 1) % n],
  };
}
