"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  ORG_ID,
  simulateCreate,
  stateAt,
  stepDefs,
  type FailKind,
  type StepId,
} from "@/lib/project-creation";

const EVENT_MS = 420;
const LINK_TTL_S = 600;

const toneText = { neutral: "text-text-secondary", ok: "text-text-primary", bad: "text-accent" } as const;

// RealEstate CRM's project creation, replayed: one transaction that also
// writes to S3. Inject a failure at any step - reported (returns false) or
// thrown - and watch the database and the bucket diverge or stay in sync.
export function ProjectCreationPlayground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [project, setProject] = useState("Skyline Heights");
  const [failAt, setFailAt] = useState<StepId | null>("documents");
  const [failKind, setFailKind] = useState<FailKind>("throws");
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [linkIssuedAt, setLinkIssuedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const name = project.trim() || "Untitled";
  const steps = useMemo(() => stepDefs(name), [name]);
  const failStep = steps.find((s) => s.id === failAt);
  const kindOptions = failStep?.canFail ?? [];
  const effectiveKind: FailKind = failAt && kindOptions.length ? (kindOptions.includes(failKind) ? failKind : kindOptions[0]) : "none";

  const { events, outcome } = useMemo(
    () => simulateCreate(name, failAt, effectiveKind),
    [name, failAt, effectiveKind],
  );
  const state = stateAt(events, shown);
  const done = shown >= events.length;
  const orphaned = done && outcome.tone === "bad" ? state.objects : [];

  useEffect(() => {
    setShown(0);
    setPlaying(false);
    setLinkIssuedAt(null);
  }, [name, failAt, effectiveKind]);

  useEffect(() => {
    if (!playing) return;
    if (shown >= events.length) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setShown((n) => n + 1), EVENT_MS);
    return () => window.clearTimeout(t);
  }, [playing, shown, events.length]);

  useEffect(() => {
    if (linkIssuedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [linkIssuedAt]);

  function run() {
    setLinkIssuedAt(null);
    if (prefersReducedMotion) {
      setShown(events.length);
      return;
    }
    if (done) setShown(0);
    setPlaying(true);
  }

  const remaining = linkIssuedAt === null ? 0 : Math.max(0, LINK_TTL_S - Math.floor((now - linkIssuedAt) / 1000));
  const linkKey = state.objects.find((o) => o.includes("/Documents/"));
  const committed = done && state.status === 200;
  const selectCls = "border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary";

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
        <span className="flex items-center gap-2 font-mono text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          One transaction, two systems
        </span>
        <span className="font-mono text-xs text-text-tertiary">createProject() · PostgreSQL + S3</span>
      </figcaption>

      <div className="space-y-6 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="font-mono text-xs text-text-tertiary">
            Project name
            <input
              value={project}
              onChange={(e) => setProject(e.target.value.slice(0, 28))}
              className="mt-1.5 block w-48 border border-border bg-bg px-2 py-1.5 text-text-primary"
            />
          </label>
          <label className="font-mono text-xs text-text-tertiary">
            Fail at
            <select
              className={`${selectCls} mt-1.5 block`}
              value={failAt ?? ""}
              onChange={(e) => setFailAt((e.target.value || null) as StepId | null)}
            >
              <option value="">nothing (happy path)</option>
              {steps
                .filter((s) => s.canFail.length)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </select>
          </label>
          {failAt && (
            <div role="radiogroup" aria-label="How it fails" className="inline-flex overflow-hidden rounded-md border border-border">
              {(["returns-false", "throws"] as const).map((k) => {
                const enabled = kindOptions.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={effectiveKind === k}
                    disabled={!enabled}
                    onClick={() => setFailKind(k)}
                    className={`px-3 py-1.5 font-mono text-xs disabled:opacity-30 ${
                      effectiveKind === k ? "bg-surface text-text-primary" : "text-text-tertiary hover:text-text-primary"
                    }`}
                  >
                    {k === "returns-false" ? "returns false" : "throws"}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={playing}
            className="border border-text-primary px-4 py-2 font-mono text-xs text-text-primary transition-colors hover:bg-text-primary hover:text-inverse-text disabled:opacity-50"
          >
            {done ? "↻ Create again" : "▶ POST /projects"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setShown((n) => Math.min(n + 1, events.length));
            }}
            disabled={done}
            className="border border-border px-4 py-2 font-mono text-xs text-text-secondary hover:border-text-primary hover:text-text-primary disabled:opacity-40"
          >
            Step →
          </button>
          {state.status && (
            <span className={`ml-auto font-mono text-xs ${state.status === 200 ? "text-text-primary" : "text-accent"}`}>
              HTTP {state.status}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="PostgreSQL" note={state.rolledBack ? "rolled back" : state.committedRows.length ? "committed" : state.pendingRows.length ? "in transaction" : "empty"}>
            {state.committedRows.map((r) => (
              <li key={`c-${r}`} className="text-text-primary">
                {r}
              </li>
            ))}
            {state.pendingRows.map((r) => (
              <li key={`p-${r}`} className="text-text-tertiary">
                {r} <span className="text-[10px]">(uncommitted)</span>
              </li>
            ))}
            {!state.committedRows.length && !state.pendingRows.length && <li className="text-text-tertiary">{"// no rows"}</li>}
          </Panel>
          <Panel title={`S3 · ${ORG_ID}/${name}/`} note="not transactional">
            {state.objects.map((o) => (
              <li key={o} className={`break-all ${orphaned.includes(o) ? "text-accent" : "text-text-primary"}`}>
                {o.slice(ORG_ID.length + name.length + 2)}
                {orphaned.includes(o) && <span className="text-[10px]"> orphaned</span>}
              </li>
            ))}
            {!state.objects.length && <li className="text-text-tertiary">{"// no objects"}</li>}
          </Panel>
        </div>

        <ol className="min-h-[8rem] space-y-1 rounded-md border border-border bg-bg p-4 font-mono text-[11px] leading-relaxed">
          {shown === 0 && <li className="text-text-tertiary">{"// Pick a failure, then send the request."}</li>}
          {events.slice(0, shown).map((e, i) => (
            <li key={i} className={`break-words ${toneText[e.tone]}`}>
              <span className="text-text-tertiary">{String(i + 1).padStart(2, "0")} </span>
              {e.text}
            </li>
          ))}
        </ol>

        <div aria-live="polite" className="min-h-[4.5rem]">
          {done && (
            <div className={`border-l-2 pl-4 ${outcome.tone === "bad" ? "border-accent" : "border-text-primary"}`}>
              <p className={`font-medium ${outcome.tone === "bad" ? "text-accent" : "text-text-primary"}`}>{outcome.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{outcome.body}</p>
              {committed && linkKey && (
                <div className="mt-4 font-mono text-[11px]">
                  {linkIssuedAt === null ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLinkIssuedAt(Date.now());
                        setNow(Date.now());
                      }}
                      className="border border-border px-3 py-1.5 text-text-secondary hover:border-text-primary hover:text-text-primary"
                    >
                      GET /documents/download → presigned link
                    </button>
                  ) : (
                    <p className="break-all text-text-secondary">
                      https://s3…/{encodeURI(linkKey)}?X-Amz-Expires=600&amp;X-Amz-Signature=…{" "}
                      <span className={remaining > 0 ? "text-accent" : "text-text-tertiary"}>
                        {remaining > 0
                          ? `expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                          : "expired"}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg p-4 font-mono text-[11px]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="truncate text-text-tertiary">{title}</span>
        <span className="shrink-0 text-[10px] text-text-tertiary">{note}</span>
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
