// Project pages (/projects/[slug]): architecture walkthroughs of systems I
// built, written from the actual codebases. Both are company projects with
// private code, so the pages describe architecture and behaviour, not
// source. Every class, schedule, topic and scope named here exists in the
// code as of Oct 2026.

export type DiagramNode = {
  id: string;
  label: string;
  sub?: string;
  // Center position, in % of the diagram box.
  x: number;
  y: number;
  kind: "client" | "service" | "module" | "store" | "queue" | "job";
};

export type DiagramEdge = {
  id: string;
  from: string;
  to: string;
  // Bow the edge by this many % (perpendicular), to route around nodes.
  bend?: number;
  dashed?: boolean;
};

export type JourneyStep = {
  title: string;
  body: string[];
  nodes: string[];
  edges: string[];
};

export type Project = {
  slug: string;
  title: string;
  tagline: string;
  categories: string[];
  period: string;
  role: string;
  stack: string[];
  metrics: { value: string; label: string }[];
  challenge: { title: string; body: string }[];
  diagram: { nodes: DiagramNode[]; edges: DiagramEdge[] };
  journeyIntro: string;
  journey: JourneyStep[];
  components: { name: string; body: string }[];
  playground: "permission-resolver" | "project-creation";
  playgroundIntro: string;
  nextUp?: { title: string; body: string }[];
  caseStudies: string[];
};

export const projects: Project[] = [
  {
    slug: "generic-workflow",
    title: "Generic WorkFlow",
    tagline:
      "A multi-tenant, metadata-driven CRM: workspaces design their own tables, forms, permissions and automations at runtime, without a schema migration or a redeploy.",
    categories: ["Backend", "Multi-tenant SaaS", "Event-driven"],
    period: "2026 – present",
    role: "Main backend engineer, YSM Infosolution",
    stack: [
      "Java 21",
      "Spring Boot 4",
      "Spring Modulith",
      "Spring Security",
      "PostgreSQL",
      "Kafka",
      "Redis",
      "React 19",
      "Docker",
    ],
    metrics: [
      { value: "67", label: "Permission keys" },
      { value: "5", label: "Grant scopes" },
      { value: "33", label: "After-commit listeners" },
    ],
    challenge: [
      {
        title: "Custom data, no migrations",
        body: "Each workspace defines its own record groups (tables), form fields (columns) and automations from the UI. The backend can't know any of that schema in advance.",
      },
      {
        title: "Access that follows a tree",
        body: "Record groups nest. Who may see or change what has to respect that hierarchy, with roles, per-user overrides and owner/admin rules, and still be cheap enough to check on every request.",
      },
      {
        title: "Twenty-plus modules, one deployable",
        body: "Auth, workspaces, records, forms, automations, billing, notifications and more live in one Spring Boot app. They must not collapse into a web of direct calls.",
      },
    ],
    diagram: {
      nodes: [
        { id: "spa", label: "React SPA", sub: "React Query", x: 50, y: 8, kind: "client" },
        { id: "api", label: "Spring Boot", sub: "JWT · @PreAuthorize", x: 50, y: 27, kind: "service" },
        { id: "identity", label: "identity", sub: "AuthorizationApi", x: 12, y: 48, kind: "module" },
        { id: "form", label: "form", sub: "field validation", x: 31, y: 48, kind: "module" },
        { id: "record", label: "record", sub: "RecordService", x: 50, y: 48, kind: "module" },
        { id: "subscription", label: "subscription", sub: "PolicyService", x: 69, y: 48, kind: "module" },
        { id: "redis", label: "Redis", sub: "4 caches", x: 88, y: 48, kind: "store" },
        { id: "postgres", label: "PostgreSQL", sub: "rows + outbox", x: 18, y: 72, kind: "store" },
        { id: "events", label: "events", sub: "after commit", x: 50, y: 72, kind: "module" },
        { id: "kafka", label: "Kafka", sub: "+ DLQ topics", x: 80, y: 72, kind: "queue" },
        { id: "jobs", label: "schedulers", sub: "cron + outbox", x: 22, y: 92, kind: "job" },
        { id: "consumers", label: "consumers", sub: "email · DLQ · retry", x: 78, y: 92, kind: "service" },
      ],
      edges: [
        { id: "spa-api", from: "spa", to: "api" },
        { id: "api-record", from: "api", to: "record" },
        { id: "record-identity", from: "record", to: "identity", bend: -10 },
        { id: "record-form", from: "record", to: "form" },
        { id: "record-subscription", from: "record", to: "subscription" },
        { id: "subscription-redis", from: "subscription", to: "redis" },
        { id: "record-postgres", from: "record", to: "postgres" },
        { id: "record-events", from: "record", to: "events", dashed: true },
        { id: "events-kafka", from: "events", to: "kafka", dashed: true },
        { id: "kafka-consumers", from: "kafka", to: "consumers", dashed: true },
        { id: "jobs-postgres", from: "jobs", to: "postgres" },
      ],
    },
    journeyIntro: "Follow one request, a user creating a record in a record group, from the browser to the side effects it sets off.",
    journey: [
      {
        title: "The request arrives",
        body: [
          "The SPA sends POST /records with a bearer access token. The refresh token never touches JavaScript: it lives in an HttpOnly, SameSite=Strict cookie scoped to /auth, and its hash is stored server-side so it can be revoked.",
          "A stateless Spring Security filter verifies the JWT and puts an AuthenticatedUser, including the current workspace, on the request.",
        ],
        nodes: ["spa", "api"],
        edges: ["spa-api"],
      },
      {
        title: "Who may do this?",
        body: [
          "RecordService asks one question of one API: does this user hold record:create on this record group? No module reads permission tables directly; they all go through AuthorizationApi.",
          "Owners bypass everything, admins everything except billing actions. Everyone else gets the union of their role's grants and their personal overrides, evaluated by scope against the record-group tree. The user's grants are loaded once into a request-scoped snapshot, so a page full of checks doesn't mean a page full of queries.",
        ],
        nodes: ["api", "record", "identity"],
        edges: ["api-record", "record-identity"],
      },
      {
        title: "Can the plan afford it?",
        body: [
          "Next, the subscription module's PolicyService: is the subscription active, is this record group locked (downgrades lock resources over the new plan's limits), and is the workspace under its MAX_RECORDS_PER_RECORD_GROUP quota for the current period?",
          "Subscription status, entitlements, locked resources and plans sit in four named Redis caches with their own TTLs, so the common case never reaches the database.",
        ],
        nodes: ["record", "subscription", "redis"],
        edges: ["record-subscription", "subscription-redis"],
      },
      {
        title: "Validate against a form nobody coded",
        body: [
          "Each submitted value is validated and normalised by its FormField definition: TEXT, NUMBER, EMAIL, DATE, SELECT or CURRENCY, with required flags and JSONB-configured rules like min, max and regex. Required fields that are missing fail the whole request.",
          "Values are stored as record_values rows keyed by field, which is what lets a workspace add a column from the UI without anyone writing a migration.",
        ],
        nodes: ["record", "form", "postgres"],
        edges: ["record-form", "record-postgres"],
      },
      {
        title: "Commit first, then tell everyone",
        body: [
          "The service publishes a RecordCreatedEvent and increments the period's usage counter in a single SQL UPDATE. Nothing else happens inline.",
          "33 @TransactionalEventListener(AFTER_COMMIT) handlers across the modules react only once the transaction has committed: the activity feed, audit log, dashboards and automations. A rolled-back request can't trigger an email about a record that doesn't exist, and modules stay decoupled, which ModulithStructureTest enforces in the build.",
        ],
        nodes: ["record", "events", "postgres"],
        edges: ["record-events", "record-postgres"],
      },
      {
        title: "Fast actions inline, slow ones on Kafka",
        body: [
          "Automations matching the CREATE trigger run next. Each action executor declares how it runs: ADD_NOTE and UPDATE_FIELD are synchronous, SEND_EMAIL is enqueued on the automation-actions Kafka topic so SMTP latency never sits in a user's request.",
          "Every run is logged in automation_logs with a retry count. Failures go to a dead-letter topic, and a scheduler re-runs failed actions every five minutes until they hit their max_retries.",
        ],
        nodes: ["events", "kafka", "consumers"],
        edges: ["events-kafka", "kafka-consumers"],
      },
      {
        title: "Housekeeping on a clock",
        body: [
          "The rest happens on schedules: subscription renewals at 01:00, trash purging and public-link expiry at 02:00, upload clean-up every five minutes, and an outbox poller every minute that confirms pending events and handles retry accounting.",
        ],
        nodes: ["jobs", "postgres"],
        edges: ["jobs-postgres"],
      },
    ],
    components: [
      { name: "AuthorizationApi", body: "The single entry point for every authorization decision in the system." },
      { name: "GrantEvaluator", body: "Pure evaluation of grants: GLOBAL, NODE, SUBTREE, GROUP_NODE, GROUP_SUBTREE." },
      { name: "Permission snapshot", body: "A user's grants, loaded once and cached for the life of the request." },
      { name: "PolicyService", body: "Active subscription, locked resources and per-period quotas." },
      { name: "Usage counters", body: "Per-workspace, per-feature, per-period counts, incremented in SQL." },
      { name: "Form engine", body: "Typed, validated fields that act as runtime-defined columns." },
      { name: "AutomationActionDispatcher", body: "Routes each action inline or onto Kafka, per its executor annotation." },
      { name: "Kafka topics", body: "automation-actions and notification-emails, each with a DLQ." },
      { name: "Retry scheduler", body: "Every 5 minutes: re-runs failed actions below their retry limit." },
      { name: "Redis caches", body: "subscriptionStatus, subscriptionEntitlements, lockedResources, subscriptionPlans." },
      { name: "Outbox poller", body: "Confirms pending outbox events every minute." },
      { name: "ModulithStructureTest", body: "Fails the build on an illegal dependency between modules." },
    ],
    playground: "permission-resolver",
    playgroundIntro:
      "The authorization rules from step 2, running in your browser. Load a scenario or build your own grants, then click a record group: the panel shows the decision and every check the evaluator made to reach it.",
    caseStudies: ["billing-concurrency", "module-boundary-fix", "agent-code-review", "zombie-process-outage"],
  },
  {
    slug: "realestate-crm",
    title: "RealEstate CRM",
    tagline:
      "A multi-tenant CRM for property developers: projects broken down to individual flats, the enquiry-to-booking pipeline, disbursements, and project documents kept private in S3.",
    categories: ["Backend", "Multi-tenant", "AWS S3"],
    period: "2025 – 2026",
    role: "Backend engineer on a two-person team, YSM Infosolution",
    stack: ["Java 21", "Spring Boot 3", "Spring Security", "PostgreSQL", "AWS S3", "React 18", "Docker", "Nginx"],
    metrics: [
      { value: "5", label: "Hierarchy levels" },
      { value: "17", label: "REST controllers" },
      { value: "10 min", label: "Download-link lifetime" },
    ],
    challenge: [
      {
        title: "A deep, shared hierarchy",
        body: "Everything hangs off an organization's projects: wings, floors and flats, plus enquiries, follow-ups, bookings, clients and the bank disbursement schedule.",
      },
      {
        title: "Private files, easy access",
        body: "Agreements, IDs and letterheads must never sit in a public bucket, but staff still need to view and share them in a click.",
      },
      {
        title: "Two systems, one operation",
        body: "Creating a project writes dozens of rows and uploads files. The database can roll back; S3 can't.",
      },
    ],
    diagram: {
      nodes: [
        { id: "spa", label: "React SPA", sub: "Vite · Tailwind", x: 50, y: 8, kind: "client" },
        { id: "nginx", label: "Nginx", sub: "/api proxy", x: 50, y: 25, kind: "service" },
        { id: "api", label: "Spring Boot", sub: "JWT · role checks", x: 50, y: 43, kind: "service" },
        { id: "projects", label: "projects", sub: "wings → flats", x: 14, y: 62, kind: "module" },
        { id: "sales", label: "enquiries", sub: "→ bookings", x: 38, y: 62, kind: "module" },
        { id: "finance", label: "disbursements", sub: "bank info", x: 62, y: 62, kind: "module" },
        { id: "documents", label: "documents", sub: "S3 storage", x: 86, y: 62, kind: "module" },
        { id: "postgres", label: "PostgreSQL", x: 30, y: 88, kind: "store" },
        { id: "scheduler", label: "scheduler", sub: "01:00 daily", x: 58, y: 88, kind: "job" },
        { id: "s3", label: "AWS S3", sub: "private bucket", x: 86, y: 88, kind: "store" },
      ],
      edges: [
        { id: "spa-nginx", from: "spa", to: "nginx" },
        { id: "nginx-api", from: "nginx", to: "api" },
        { id: "api-projects", from: "api", to: "projects" },
        { id: "api-sales", from: "api", to: "sales" },
        { id: "api-finance", from: "api", to: "finance" },
        { id: "api-documents", from: "api", to: "documents" },
        { id: "projects-postgres", from: "projects", to: "postgres" },
        { id: "sales-postgres", from: "sales", to: "postgres" },
        { id: "finance-postgres", from: "finance", to: "postgres", bend: 6 },
        { id: "documents-s3", from: "documents", to: "s3" },
        { id: "scheduler-postgres", from: "scheduler", to: "postgres" },
      ],
    },
    journeyIntro: "Follow a project from creation to a buyer's booking, and the files that travel with it.",
    journey: [
      {
        title: "One origin, no CORS",
        body: [
          "The React SPA is served by Nginx, which also proxies /api/* to the Spring Boot container. The browser only ever talks to one origin.",
          "Security is stateless JWT with access and refresh tokens, and endpoints are gated by role. Every authenticated user carries their organization id, which the services use to scope data to that tenant.",
        ],
        nodes: ["spa", "nginx", "api"],
        edges: ["spa-nginx", "nginx-api"],
      },
      {
        title: "Create a project in one request",
        body: [
          "An admin submits the whole project at once: details, a MahaRERA number, wings with their floors and flats, approved banks, amenities, documents and the disbursement schedule. Project names and MahaRERA numbers are checked for uniqueness first.",
          "It all runs in one @Transactional method, so the rows commit together or not at all.",
        ],
        nodes: ["api", "projects", "finance", "postgres"],
        edges: ["api-projects", "api-finance", "projects-postgres", "finance-postgres"],
      },
      {
        title: "Files go to S3, keys go to the database",
        body: [
          "The letterhead and project documents upload to a private bucket under {orgId}/{projectName}/LetterHead/ and /Documents/. Only the object key is stored in PostgreSQL, never bytes or a public URL.",
          "Because the uploads happen mid-transaction and S3 can't roll back, a sub-step that reports failure triggers a compensating delete: list everything under the project's prefix, batch-delete it, then throw so the database rolls back too.",
        ],
        nodes: ["api", "documents", "s3", "postgres"],
        edges: ["api-documents", "documents-s3"],
      },
      {
        title: "Short-lived links instead of a public bucket",
        body: [
          "Viewing or sharing a document asks the API for a presigned GET URL for that one object, valid for ten minutes. Access control stays in the application; the bucket stays private.",
        ],
        nodes: ["documents", "s3"],
        edges: ["documents-s3"],
      },
      {
        title: "From enquiry to booking",
        body: [
          "Sales staff log enquiries against a project and track them through follow-ups. A booking ties three things together: the enquiry it came from, the specific flat, and the client buying it.",
        ],
        nodes: ["api", "sales", "postgres"],
        edges: ["api-sales", "sales-postgres"],
      },
      {
        title: "A to-do list that writes itself",
        body: [
          "At 01:00 every day a scheduler generates the follow-up tasks due, so each employee starts the morning with a current queue instead of yesterday's leftovers.",
        ],
        nodes: ["scheduler", "postgres"],
        edges: ["scheduler-postgres"],
      },
    ],
    components: [
      { name: "ProjectServiceImpl", body: "Creates a project and its whole hierarchy in one transaction." },
      { name: "hardDeleteProjectRecursive", body: "Compensation: S3 prefix delete plus rows, used to undo a failed create." },
      { name: "S3StorageService", body: "Upload, download and batch prefix delete with AWS SDK v2." },
      { name: "S3PresignedUrlService", body: "Single-object GET links that expire after 10 minutes." },
      { name: "DailyTaskScheduler", body: "Generates the day's follow-up tasks at 01:00." },
      { name: "Nginx", body: "Serves the SPA and proxies /api to the backend container." },
      { name: "JWT security", body: "Stateless access + refresh tokens, role-gated endpoints." },
      { name: "Docker Compose", body: "PostgreSQL, backend and the Nginx frontend as one stack." },
    ],
    playground: "project-creation",
    playgroundIntro:
      "Step 3's failure handling, replayed. Make any step fail, either by reporting failure or by throwing, and compare what's left in the database and in the bucket.",
    nextUp: [
      {
        title: "Compensate on exceptions too",
        body: "The clean-up only runs when a step returns false. An exception skips it, so files uploaded earlier in the request are left in S3. Registering the S3 clean-up as an after-rollback hook would cover both paths.",
      },
      {
        title: "Page through large prefixes",
        body: "A single listObjectsV2 call returns at most 1,000 keys, and the prefix delete reads one page. A project with more files would be only partly cleaned.",
      },
      {
        title: "Key objects by id, not name",
        body: "Keys use the project's name. Renaming a project would separate it from its files; a stable project id in the prefix wouldn't.",
      },
    ],
    caseStudies: ["s3-document-lifecycle"],
  },
];

// Smaller things I've built or shipped - listed, not walked through.
export const otherProjects: { title: string; period: string; body: string; stack: string[]; href?: string }[] = [
  {
    title: "Follow-up Management System",
    period: "2025",
    body: "A follow-up CRM built with a team of four interns I led end to end: entity design, a soft-delete audit trail, automated follow-up scheduling and Chart.js reporting dashboards.",
    stack: ["Spring Boot", "Hibernate/JPA", "PostgreSQL", "Thymeleaf"],
  },
  {
    title: "Internal apps: containerised and deployed",
    period: "2026",
    body: "Moved internal Spring Boot applications, including a document management system and a jewellery-store API, onto Docker with Nginx and GitHub Actions pipelines deploying to a VPS.",
    stack: ["Docker", "Nginx", "GitHub Actions", "Linux"],
  },
  {
    title: "Upadhye Learning",
    period: "2025",
    body: "An AI-powered e-learning platform split into Spring Boot microservices behind a gateway with Eureka service discovery and Kafka between services.",
    stack: ["Spring Boot", "Eureka", "Kafka", "React", "PostgreSQL"],
  },
  {
    title: "Epic Taste Exchange",
    period: "2024",
    body: "A client website with a searchable product catalogue and enquiry and sample-request forms delivered by email.",
    stack: ["Spring Boot", "JSP", "Spring Mail", "Bootstrap"],
    href: "https://github.com/Nyazul/ETE",
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getAdjacentProjects(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  return {
    prev: projects[(i - 1 + projects.length) % projects.length],
    next: projects[(i + 1) % projects.length],
  };
}

export const projectTitleTransition = (slug: string) => `project-title-${slug}`;
