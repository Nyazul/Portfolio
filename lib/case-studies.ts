export { TODO, isFilled } from "@/lib/todo";

export type CodeSample = {
  lang: "java" | "sql" | "yaml" | "bash";
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
  diagram?: "race-timeline" | "leak-timeline";
  // Named interactive demo, rendered after the step's code sample.
  playground?: "quota-race";
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
    slug: "zombie-process-outage",
    title: "The server that died every 5.4 days",
    excerpt:
      "Every five or six days the production server stopped accepting SSH, the API returned 500s and even monitoring went dark. A reboot fixed it, until it came back. The cause was a Kafka health check quietly leaking one process every 15 seconds.",
    role: "Backend engineer, owning deployment",
    timeframe: "Sep 2026",
    stack: ["Docker", "Linux", "Kafka", "systemd"],
    keyFacts: [
      { label: "Days of uptime until lockup", value: "5.4" },
      { label: "Zombie processes leaked per hour", value: "240" },
      { label: "Lines of config in the fix", value: "1" },
    ],
    problem: [
      "Generic WorkFlow runs as a Docker Compose stack on a single VPS: the Spring Boot backend, PostgreSQL, Kafka and an Nginx-served frontend. In September 2026 the whole machine started becoming unresponsive every five to six days.",
      "It wasn't one service failing. SSH dropped with 'Connection closed'. The backend returned 500s because it couldn't create threads or open database connections. Docker health checks failed with 'OCI runtime exec failed: resource temporarily unavailable'. The hosting control panel stopped responding.",
      "Worse, SAR and cron stopped collecting data too, so the monitoring went blind at the exact moment it was needed. A reboot fixed everything, wiped whatever evidence there was, and about five days later it happened again.",
    ],
    approach: [
      {
        heading: "Read the symptoms as one failure",
        body: [
          "Every symptom had the same shape: something failed when it tried to start a new process or thread. SSH needs to fork a session, the JVM needs a native thread for a connection, and Docker needs a process for each health check. 'Resource temporarily unavailable' is EAGAIN, the kernel refusing to create a task.",
          "The cadence was the other clue. A failure that arrives on a steady schedule and resets on reboot is usually a leak with a constant rate, filling a fixed-size table. Here the table was the kernel's task table, capped by threads-max at 31,069 on this VPS.",
        ],
        diagram: "leak-timeline",
      },
      {
        heading: "Find what was filling the table",
        body: [
          "The task table was filling with zombies: exited processes whose parent never collected their exit status. They were leftovers of the Kafka container's health check, a small TCP probe Docker ran inside the container every 15 seconds.",
          "Inside a container, PID 1 inherits any orphaned process and is responsible for reaping it with wait(). In the Kafka container PID 1 was the JVM itself, and the JVM never reaps children it didn't start. Each probe left one zombie behind: 4 a minute, 240 an hour.",
          "That makes the outage pure arithmetic. 31,069 slots divided by 240 leaked per hour is about 129 hours, or 5.4 days of uptime, before every fork() on the host fails.",
        ],
        code: {
          lang: "yaml",
          caption: "The health check, run every 15s inside the Kafka container",
          snippet: `kafka:
  image: apache/kafka:3.7.0
  healthcheck:
    test: ["CMD-SHELL", "timeout 5 bash -c 'exec 3<>/dev/tcp/127.0.0.1/9092'"]
    interval: 15s`,
        },
      },
      {
        heading: "Give the container a real init",
        body: [
          "The fix is one line. With init: true, Docker starts tini as the container's PID 1 and runs the JVM under it. tini's whole job is to reap orphaned children, so health-check processes are collected the moment they exit.",
        ],
        code: {
          lang: "yaml",
          caption: "The fix: tini as PID 1 reaps health-check children",
          snippet: `kafka:
  image: apache/kafka:3.7.0
  # Use tini as PID 1 so health-check child processes are reaped.
  # Without it, each 15s probe leaves a zombie under the Kafka JVM.
  init: true`,
        },
      },
      {
        heading: "Watch the resource that actually ran out",
        body: [
          "The exhausted resource was one that usual host dashboards don't graph, so I added a small monitor for it: a systemd timer that runs every 10 minutes and records the task count against threads-max, the zombie count and the load average.",
          "It warns at 80% of threads-max, escalates at 95%, and also alerts on a zombie spike. Alerts fire once per state change rather than every run, go to syslog and optionally to a webhook, and the script always exits 0 so the timer itself never flaps.",
          "The first version had its own bug: it parsed the wrong field of /proc/loadavg. The fourth field is running/total, and only the total is the number that matters. Testing the monitor against the real host caught it the same day.",
        ],
        code: {
          lang: "bash",
          caption: "Excerpt from the monitor (simplified)",
          snippet: `THREADS_MAX="$(cat /proc/sys/kernel/threads-max)"
# /proc/loadavg field 4 is "running/total" (e.g. "9/412") - we want the total.
TASKS="$(awk '{split($4,a,"/"); print a[2]}' /proc/loadavg)"
ZOMBIES="$(ps -eo stat | grep -c '^Z')"

WARN=$(( THREADS_MAX * 80 / 100 ))
CRIT=$(( THREADS_MAX * 95 / 100 ))

if [ "$TASKS" -ge "$CRIT" ] && [ ! -f "$STATE/crit" ]; then
  touch "$STATE/crit"
  alert CRITICAL "Kernel task count $TASKS >= $CRIT - fork() will fail host-wide"
fi`,
        },
        callouts: [
          { label: "Every 10 minutes", body: "systemd oneshot + timer appends a history line: tasks, zombies, load." },
          { label: "80% / 95%", body: "WARNING and CRITICAL thresholds against the host's own threads-max." },
          { label: "Once per transition", body: "State files in /run mean one alert per change, not one per run." },
          { label: "Webhook optional", body: "Slack, Discord or ntfy push; syslog and a log file either way." },
        ],
      },
    ],
    outcome: [
      "With tini reaping health-check children the leak stopped, and the server no longer has a countdown on it. The monitor's history line now gives a cheap, continuous record of task-table pressure, so a leak like this would show up as a rising line days before it became an outage.",
    ],
    lessons: [
      "PID 1 has a job. If the process in that slot isn't an init, anything that orphans children inside the container leaks.",
      "Health checks are production code. One that runs every 15 seconds runs 5,760 times a day, so any per-run leak compounds fast.",
      "A failure on a steady schedule is a rate problem. Find the table that's filling and divide.",
      "Monitor the resource that actually runs out, not only the ones that are easy to graph.",
    ],
    nodeId: "monitoring",
  },
  {
    slug: "billing-concurrency",
    title: "Concurrency-safe subscription billing",
    excerpt:
      "Two concurrent requests could both read the same usage quota before either wrote back, letting both through when only one should have been allowed. The fix: make the database enforce the invariant.",
    role: "Backend engineer",
    timeframe: "2026",
    stack: ["Spring Boot", "PostgreSQL", "JPA"],
    keyFacts: [
      { label: "Statements to enforce quota", value: "1" },
      { label: "Typed violation responses", value: "3" },
      { label: "Metered limits across 3 plans", value: "4" },
    ],
    problem: [
      "The multi-tenant workspace platform bills on usage. Each plan (Basic, Pro or Enterprise) grants a quota per metric: record groups, records per group, automations and active users. Every metered action has to check that quota before it's allowed through.",
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
        playground: "quota-race",
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
    timeframe: "2026",
    stack: ["Spring Modulith", "Kafka", "Java"],
    keyFacts: [
      { label: "Modules verified on every build", value: "18" },
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
          "Some cycles couldn't be solved with events, because the upstream domain genuinely needed an answer back. The clearest case was permissions: the permission module has to check that a form, automation or record exists in a workspace before granting access to it, and those modules already depended on permissions.",
          "So the permission module defines a registry port for what it needs, and the form, automation and record modules each implement it with an adapter. Permissions never imports a single type from the modules it guards.",
        ],
        code: {
          lang: "java",
          caption: "Simplified: the permission module owns the port",
          snippet: `// identity/permission - the module that needs the answer owns the contract.
public interface ResourceRegistryPort {
    ResourceType resourceType();
    boolean existsInWorkspace(UUID resourceId, UUID workspaceId);
}

// record/api/lookup - depends on permission, never the reverse.
@Component
class RecordRegistryAdapter implements RecordGroupScopedResourceRegistryPort {
    /* answers from RecordRepository */
}`,
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
    timeframe: "2026",
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
