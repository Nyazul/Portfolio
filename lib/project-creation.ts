// Model of RealEstate CRM's createProject (ProjectServiceImpl) for
// <ProjectCreationPlayground/>. One @Transactional method writes the project
// and everything under it to PostgreSQL, but also uploads files to S3 along
// the way - and S3 is not part of the transaction. When a sub-step reports
// failure (returns false), the method compensates by deleting the project's
// S3 prefix and rows (hardDeleteProjectRecursive) before throwing. When a
// sub-step throws instead, that compensation is skipped: the database rolls
// back, but objects already in S3 stay there.
//
// Step order, key layout ({orgId}/{projectName}/LetterHead|Documents/...)
// and the 10-minute presigned links match the real code; the file names and
// row counts are illustrative.

export type FailKind = "none" | "returns-false" | "throws";

export type StepId =
  | "name"
  | "rera"
  | "letterhead"
  | "project"
  | "wings"
  | "banks"
  | "amenities"
  | "documents"
  | "disbursements";

export type StepDef = {
  id: StepId;
  label: string;
  // Rows this step inserts (inside the transaction).
  rows?: string[];
  // Objects this step uploads to S3 (outside the transaction).
  objects?: string[];
  // Which failure kinds make sense for this step.
  canFail: FailKind[];
};

export const ORG_ID = "7f3a9c";

export function stepDefs(project: string): StepDef[] {
  const p = `${ORG_ID}/${project}`;
  return [
    { id: "name", label: "Project name unique in org", canFail: [] },
    { id: "rera", label: "MahaRERA number unique", canFail: [] },
    {
      id: "letterhead",
      label: "Upload letterhead",
      objects: [`${p}/LetterHead/letterhead.pdf`],
      canFail: ["throws"],
    },
    { id: "project", label: "Save project", rows: ["project"], canFail: [] },
    {
      id: "wings",
      label: "Wings → floors → flats",
      rows: ["wing ×2", "floor ×8", "flat ×32"],
      canFail: ["returns-false", "throws"],
    },
    { id: "banks", label: "Approved bank info", rows: ["bank_project_info ×2"], canFail: ["returns-false", "throws"] },
    { id: "amenities", label: "Amenities", rows: ["amenity ×5"], canFail: ["returns-false", "throws"] },
    {
      id: "documents",
      label: "Documents",
      rows: ["document ×2"],
      objects: [`${p}/Documents/agreement.pdf`, `${p}/Documents/layout-plan.pdf`],
      canFail: ["returns-false", "throws"],
    },
    {
      id: "disbursements",
      label: "Disbursement schedule",
      rows: ["disbursement ×4"],
      canFail: ["returns-false", "throws"],
    },
  ];
}

export type Tone = "neutral" | "ok" | "bad";

export type ProjectEvent = {
  text: string;
  tone: Tone;
  step?: StepId;
  addRows?: string[];
  addObjects?: string[];
  deleteObjects?: "prefix";
  commit?: boolean;
  rollback?: boolean;
  status?: number;
};

export type Outcome = { tone: Tone; title: string; body: string };

export function simulateCreate(
  project: string,
  failAt: StepId | null,
  failKind: FailKind,
): { events: ProjectEvent[]; outcome: Outcome } {
  const steps = stepDefs(project);
  const events: ProjectEvent[] = [{ text: "BEGIN  @Transactional createProject()", tone: "neutral" }];

  for (const step of steps) {
    const failing = failAt === step.id && failKind !== "none";

    if (failing && failKind === "throws") {
      events.push({ text: `${step.label}: exception thrown`, tone: "bad", step: step.id });
      events.push({
        text: "Exception skips the `if (!…)` compensation branch",
        tone: "bad",
      });
      events.push({ text: "ROLLBACK  database changes undone", tone: "neutral", rollback: true, status: 500 });
      return {
        events,
        outcome: {
          tone: "bad",
          title: "Database clean, S3 not",
          body: "The transaction rolled every row back, but S3 has no transaction to roll back. Files uploaded before the failure are now orphaned: nothing in the database points to them and nothing will delete them.",
        },
      };
    }

    if (failing && failKind === "returns-false") {
      // The sub-step's own writes never land: it reports failure instead.
      events.push({ text: `${step.label}: returned false`, tone: "bad", step: step.id });
      events.push({ text: "Compensate: hardDeleteProjectRecursive()", tone: "neutral" });
      events.push({
        text: `S3 listObjectsV2(prefix="${ORG_ID}/${project}/") → deleteObjects(batch)`,
        tone: "ok",
        deleteObjects: "prefix",
      });
      events.push({ text: "Delete wings, banks, amenities, documents, disbursements, project", tone: "ok" });
      events.push({ text: "throw ApiException(500) → ROLLBACK", tone: "neutral", rollback: true, status: 500 });
      return {
        events,
        outcome: {
          tone: "ok",
          title: "Rolled back cleanly",
          body: "The failure was reported, so the compensating delete ran: it removed everything under the project's S3 prefix, then the exception rolled back the database. Nothing is left behind.",
        },
      };
    }

    const parts: string[] = [];
    if (step.objects) parts.push(`PUT ${step.objects.length} object(s) to S3`);
    if (step.rows) parts.push(`INSERT ${step.rows.join(", ")}`);
    events.push({
      text: `${step.label}${parts.length ? `: ${parts.join(" · ")}` : " ✓"}`,
      tone: "neutral",
      step: step.id,
      addRows: step.rows,
      addObjects: step.objects,
    });
  }

  events.push({ text: "COMMIT  200 OK", tone: "ok", commit: true, status: 200 });
  return {
    events,
    outcome: {
      tone: "ok",
      title: "Project created",
      body: "Rows committed together; files live under the project's prefix. Downloads go through 10-minute presigned links, so the bucket itself never has to be public.",
    },
  };
}

export type CreationState = {
  pendingRows: string[];
  committedRows: string[];
  objects: string[];
  rolledBack: boolean;
  status: number | null;
};

// Fold the first `count` events into the visible database / bucket state.
export function stateAt(events: ProjectEvent[], count: number): CreationState {
  const s: CreationState = { pendingRows: [], committedRows: [], objects: [], rolledBack: false, status: null };
  for (const e of events.slice(0, count)) {
    if (e.addRows) s.pendingRows.push(...e.addRows);
    if (e.addObjects) s.objects.push(...e.addObjects);
    if (e.deleteObjects) s.objects = [];
    if (e.commit) {
      s.committedRows = s.pendingRows;
      s.pendingRows = [];
    }
    if (e.rollback) {
      s.pendingRows = [];
      s.rolledBack = true;
    }
    if (e.status) s.status = e.status;
  }
  return s;
}
