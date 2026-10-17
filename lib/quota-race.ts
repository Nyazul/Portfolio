// Deterministic model of the billing quota race from the
// billing-concurrency case study, driving <QuotaRacePlayground/>.
//
// One usage counter (count=99, limit=100: one unit left) and two
// requests, A at t=0 and B `gap` ms later, each trying to consume one unit.
// The timeline is computed up front from (mode, gap); the playground only
// moves a playhead across it. Durations are illustrative, not measured -
// what matters is the ordering, and that one ordering rule decides each
// outcome (see raceWindow()).

export type RaceMode = "read-check-write" | "check-then-increment" | "guarded-update";

export const QUOTA = 100;
export const START_USED = 99;

// Simulated milliseconds per phase.
const READ_MS = 90;
const CHECK_MS = 50;
const WRITE_MS = 90;

export type Lane = "A" | "B";
export type SegmentKind = "read" | "check" | "write" | "wait" | "update" | "reject";
export type Tone = "neutral" | "ok" | "bad";

export type Segment = {
  lane: Lane;
  kind: SegmentKind;
  start: number;
  end: number;
  label: string;
};

export type LogLine = {
  t: number;
  lane: Lane;
  text: string;
  tone: Tone;
  // This line is the moment the request was let through.
  grant?: boolean;
};

export type RaceResult = {
  segments: Segment[];
  log: LogLine[];
  // Committed value of `used` over time: [t, used], ascending t.
  commits: [number, number][];
  // How many requests the system allowed through.
  granted: number;
  end: number;
  verdict: { tone: Tone; title: string; body: string };
};

export const MODES: { id: RaceMode; label: string; caption: string }[] = [
  {
    id: "read-check-write",
    label: "Read → check → write",
    caption: "The first prototype: load the counter, compare in Java, save count + 1.",
  },
  {
    id: "check-then-increment",
    label: "Check, then atomic +1",
    caption: "Today's code: the increment is one SQL UPDATE, but the limit is still checked in Java first.",
  },
  {
    id: "guarded-update",
    label: "Guarded UPDATE",
    caption: "The fix I'd make next: the limit moves into the UPDATE's WHERE clause.",
  },
];

// Largest gap (exclusive) at which B still reads before A commits, for the
// two check-then-act modes. The guarded UPDATE has no window at all.
export function raceWindow(mode: RaceMode): number {
  if (mode === "guarded-update") return 0;
  // A commits at READ+CHECK+WRITE; B's read lands at gap+READ.
  return CHECK_MS + WRITE_MS;
}

const SELECT = "SELECT count FROM workspace_usage_counters";

export function simulateRace(mode: RaceMode, gap: number): RaceResult {
  return mode === "guarded-update" ? guarded(gap) : checkThenAct(mode, gap);
}

function checkThenAct(mode: RaceMode, gap: number): RaceResult {
  const segments: Segment[] = [];
  const log: LogLine[] = [];
  const commits: [number, number][] = [[0, START_USED]];
  const increment = mode === "check-then-increment";

  // Request A: never contended, it's first everywhere.
  const aReadEnd = READ_MS;
  const aCheckEnd = aReadEnd + CHECK_MS;
  const aCommit = aCheckEnd + WRITE_MS;
  const aUsed = START_USED + 1;
  segments.push(
    { lane: "A", kind: "read", start: 0, end: aReadEnd, label: "read" },
    { lane: "A", kind: "check", start: aReadEnd, end: aCheckEnd, label: "check" },
    { lane: "A", kind: "write", start: aCheckEnd, end: aCommit, label: "write" },
  );
  log.push(
    { t: aReadEnd, lane: "A", text: `${SELECT} → ${START_USED}`, tone: "neutral" },
    { t: aCheckEnd, lane: "A", text: `${START_USED} + 1 ≤ ${QUOTA} ✓ allowed`, tone: "neutral", grant: true },
    {
      t: aCommit,
      lane: "A",
      text: increment
        ? `UPDATE … SET count = count + 1 → count = ${aUsed}`
        : `save(count = ${aUsed})`,
      tone: "neutral",
    },
  );
  commits.push([aCommit, aUsed]);

  // Request B: what it reads depends on whether A has committed yet.
  const bReadEnd = gap + READ_MS;
  const bSeen = bReadEnd < aCommit ? START_USED : aUsed;
  const bCheckEnd = bReadEnd + CHECK_MS;
  segments.push(
    { lane: "B", kind: "read", start: gap, end: bReadEnd, label: "read" },
    { lane: "B", kind: "check", start: bReadEnd, end: bCheckEnd, label: "check" },
  );
  log.push({
    t: bReadEnd,
    lane: "B",
    text: `${SELECT} → ${bSeen}${bSeen === START_USED ? "   (A hasn't committed yet)" : ""}`,
    tone: bSeen === START_USED ? "bad" : "neutral",
  });

  if (bSeen + 1 > QUOTA) {
    // Arrived late enough to see A's write: correctly rejected.
    const rejectEnd = bCheckEnd + 30;
    segments.push({ lane: "B", kind: "reject", start: bCheckEnd, end: rejectEnd, label: "409" });
    log.push(
      { t: bCheckEnd, lane: "B", text: `${bSeen} + 1 > ${QUOTA} ✗ rejected`, tone: "ok" },
      { t: rejectEnd, lane: "B", text: "throw QuotaExceededException", tone: "ok" },
    );
    const window = raceWindow(mode);
    return {
      segments,
      log,
      commits,
      granted: 1,
      end: Math.max(aCommit, rejectEnd),
      verdict: {
        tone: "neutral",
        title: "Correct, by luck",
        body: `B arrived after A committed, so it read ${aUsed} and was turned away. Nothing in the code made this safe: drag the gap below ${window} ms and the same code lets both through.`,
      },
    };
  }

  // B passed a stale check. Its write may queue behind A's row lock -
  // the database is locking, just around the wrong thing.
  log.push({ t: bCheckEnd, lane: "B", text: `${bSeen} + 1 ≤ ${QUOTA} ✓ allowed`, tone: "bad", grant: true });
  let bWriteStart = bCheckEnd;
  if (bCheckEnd < aCommit) {
    segments.push({ lane: "B", kind: "wait", start: bCheckEnd, end: aCommit, label: "lock" });
    log.push({ t: bCheckEnd, lane: "B", text: "UPDATE waits for A's row lock…", tone: "neutral" });
    bWriteStart = aCommit;
  }
  const bCommit = bWriteStart + WRITE_MS;
  const bUsed = increment ? aUsed + 1 : bSeen + 1;
  segments.push({ lane: "B", kind: "write", start: bWriteStart, end: bCommit, label: "write" });
  log.push({
    t: bCommit,
    lane: "B",
    text: increment
      ? `UPDATE … SET count = count + 1 → count = ${bUsed}`
      : `save(count = ${bUsed})   (overwrites A)`,
    tone: "bad",
  });
  commits.push([bCommit, bUsed]);

  return {
    segments,
    log,
    commits,
    granted: 2,
    end: bCommit,
    verdict: increment
      ? {
          tone: "bad",
          title: `Over quota: ${bUsed} / ${QUOTA}`,
          body: "Both passed the Java check before either incremented, then both incremented. Nothing was lost this time, so the counter honestly reads 101, but the workspace is over its limit. The increment is atomic; the check isn't.",
        }
      : {
          tone: "bad",
          title: `Two allowed, counter says ${bUsed}`,
          body: `With one unit left, both requests got through. B saved the ${bUsed} it computed from a stale read, erasing A's increment: ${QUOTA + 1} units used, ${bUsed} recorded, and nothing anywhere says so.`,
        },
  };
}

function guarded(gap: number): RaceResult {
  const segments: Segment[] = [];
  const log: LogLine[] = [];
  const commits: [number, number][] = [[0, START_USED]];
  const stmt = `UPDATE … SET count = count + 1 WHERE count + 1 ≤ ${QUOTA}`;

  const aCommit = WRITE_MS;
  segments.push({ lane: "A", kind: "update", start: 0, end: aCommit, label: "UPDATE" });
  log.push({ t: aCommit, lane: "A", text: `${stmt} → 1 row`, tone: "ok", grant: true });
  commits.push([aCommit, START_USED + 1]);

  let bStart = gap;
  if (gap < aCommit) {
    segments.push({ lane: "B", kind: "wait", start: gap, end: aCommit, label: "lock" });
    log.push({ t: gap, lane: "B", text: "UPDATE waits for A's row lock…", tone: "neutral" });
    bStart = aCommit;
  }
  const bEnd = bStart + WRITE_MS;
  const rejectEnd = bEnd + 30;
  segments.push(
    { lane: "B", kind: "update", start: bStart, end: bEnd, label: "UPDATE" },
    { lane: "B", kind: "reject", start: bEnd, end: rejectEnd, label: "409" },
  );
  log.push(
    {
      t: bEnd,
      lane: "B",
      text: `${stmt} → 0 rows${gap < aCommit ? "   (WHERE re-checked after A's commit)" : ""}`,
      tone: "ok",
    },
    { t: rejectEnd, lane: "B", text: "throw QuotaExceededException", tone: "ok" },
  );

  return {
    segments,
    log,
    commits,
    granted: 1,
    end: rejectEnd,
    verdict: {
      tone: "ok",
      title: "One allowed, one rejected, at any gap",
      body: "The check and the write are one statement, so there's no window to land in. PostgreSQL serializes the two UPDATEs on the row lock and re-evaluates B's WHERE against A's committed value.",
    },
  };
}

// Committed `used` at time t.
export function usedAt(commits: [number, number][], t: number): number {
  let used = commits[0][1];
  for (const [ct, v] of commits) {
    if (ct <= t) used = v;
  }
  return used;
}
