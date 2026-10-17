"use client";

import { useMemo, useState } from "react";
import {
  GROUPS,
  KEYS,
  SCENARIOS,
  decide,
  groupAndAncestors,
  groupName,
  keyDef,
  traceableGroups,
  type Grant,
  type GrantSource,
  type KeyId,
  type Persona,
  type Scope,
} from "@/lib/permission-model";

const PERSONAS: { id: Persona; label: string }[] = [
  { id: "member", label: "Member" },
  { id: "admin", label: "Admin" },
  { id: "owner", label: "Owner" },
];

let grantSeq = 0;

// Generic WorkFlow's authorization, live: pick who is asking, edit their
// grants, and click any record group to see the decision and the exact
// path the evaluator took. The tree shades each group as allowed,
// traceable-only (visible by name, contents hidden) or invisible.
export function PermissionPlayground() {
  const [persona, setPersona] = useState<Persona>(SCENARIOS[0].persona);
  const [grants, setGrants] = useState<Grant[]>(SCENARIOS[0].grants);
  const [scenario, setScenario] = useState<string | null>(SCENARIOS[0].id);
  const [key, setKey] = useState<KeyId>("record:create");
  const [target, setTarget] = useState("shortlisted");

  // Draft grant for the "add" row.
  const [draftSource, setDraftSource] = useState<GrantSource>("override");
  const [draftKey, setDraftKey] = useState<KeyId>("record_group:view");
  const [draftScope, setDraftScope] = useState<Scope>("NODE");
  const [draftGroup, setDraftGroup] = useState("alumni");

  const decision = useMemo(() => decide(persona, grants, key, target), [persona, grants, key, target]);
  const traceable = useMemo(() => traceableGroups(persona, grants), [persona, grants]);
  const isWorkspaceKey = keyDef(key).kind === "workspace";

  function loadScenario(id: string) {
    const s = SCENARIOS.find((x) => x.id === id)!;
    setScenario(id);
    setPersona(s.persona);
    setGrants(s.grants);
  }

  function addGrant() {
    const scope = keyDef(draftKey).scopes.includes(draftScope) ? draftScope : keyDef(draftKey).scopes[0];
    setGrants((g) => [
      ...g,
      {
        id: `g${++grantSeq}`,
        key: draftKey,
        scope,
        groupId: scope === "GLOBAL" ? null : draftGroup,
        source: draftSource,
      },
    ]);
    setScenario(null);
  }

  const draftScopes = keyDef(draftKey).scopes;
  const selectCls =
    "border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary focus-visible:outline-2";

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
        <span className="flex items-center gap-2 font-mono text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Permission resolver
        </span>
        <span className="font-mono text-xs text-text-tertiary">
          same rules as AuthorizationService + GrantEvaluator
        </span>
      </figcaption>

      <div className="space-y-6 p-5">
        {/* Scenarios */}
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadScenario(s.id)}
              aria-pressed={scenario === s.id}
              className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-colors ${
                scenario === s.id
                  ? "border-accent text-accent"
                  : "border-border text-text-tertiary hover:text-text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          {/* Left: who + tree */}
          <div className="space-y-5">
            <div>
              <p className="mb-2 font-mono text-xs text-text-tertiary">Who is asking</p>
              <div role="radiogroup" aria-label="Persona" className="inline-flex overflow-hidden rounded-md border border-border">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={persona === p.id}
                    onClick={() => {
                      setPersona(p.id);
                      setScenario(null);
                    }}
                    className={`px-3 py-1.5 font-mono text-xs ${
                      persona === p.id ? "bg-surface text-text-primary" : "text-text-tertiary hover:text-text-primary"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-tertiary">Asking for</p>
              <div role="radiogroup" aria-label="Permission key" className="space-y-1">
                {KEYS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={key === k.id}
                    onClick={() => setKey(k.id)}
                    className={`flex w-full items-baseline justify-between gap-3 rounded-md px-3 py-2 text-left font-mono text-xs ${
                      key === k.id ? "bg-surface text-text-primary" : "text-text-tertiary hover:text-text-primary"
                    }`}
                  >
                    <span>
                      <span className={key === k.id ? "text-accent" : undefined}>{key === k.id ? "● " : "○ "}</span>
                      {k.id}
                    </span>
                    <span className="truncate text-[11px] text-text-tertiary">
                      {k.billingSensitive ? "billing-sensitive" : k.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-tertiary">
                Record groups {isWorkspaceKey ? "(workspace-level key)" : "(click one to check it)"}
              </p>
              <ul className="space-y-1 font-mono text-xs" aria-label="Record group tree">
                {GROUPS.map((g) => {
                  const depth = groupAndAncestors(g.id).length - 1;
                  const allowed = decide(persona, grants, key, g.id).allowed;
                  const canTrace = traceable.has(g.id);
                  const selected = target === g.id && !isWorkspaceKey;
                  return (
                    <li key={g.id} style={{ paddingLeft: depth * 18 }}>
                      <button
                        type="button"
                        onClick={() => setTarget(g.id)}
                        disabled={isWorkspaceKey}
                        aria-pressed={selected}
                        className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                          selected ? "border-accent" : "border-transparent hover:border-border"
                        }`}
                      >
                        <span className={canTrace ? "text-text-primary" : "text-text-tertiary line-through opacity-60"}>
                          {depth > 0 && <span className="text-text-tertiary">└ </span>}
                          {g.name}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] ${
                            allowed ? "text-accent" : canTrace ? "text-text-tertiary" : "text-text-tertiary opacity-60"
                          }`}
                        >
                          {isWorkspaceKey ? "" : allowed ? "✓ allowed" : canTrace ? "name only" : "invisible"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Right: decision + trace + grants */}
          <div className="space-y-5">
            <div aria-live="polite" className="rounded-md border border-border bg-bg p-4">
              <p
                className={`text-3xl font-medium tracking-tight ${decision.allowed ? "text-accent" : "text-text-primary"}`}
              >
                {decision.allowed ? "ALLOW" : "DENY"}
              </p>
              <ol className="mt-4 space-y-1.5 font-mono text-[11px] leading-relaxed">
                {decision.trace.map((t, i) => (
                  <li key={i} className="grid grid-cols-[1rem_1fr] gap-2">
                    <span
                      className={
                        t.result === "pass" ? "text-accent" : t.result === "fail" ? "text-text-tertiary" : "text-text-tertiary"
                      }
                    >
                      {t.result === "pass" ? "✓" : t.result === "fail" ? "✗" : "·"}
                    </span>
                    <span className={t.result === "pass" ? "text-text-primary" : "text-text-secondary"}>{t.text}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-tertiary">
                Grants {persona !== "member" && "(ignored unless the bypass doesn't apply)"}
              </p>
              <ul className="space-y-1.5 font-mono text-[11px]">
                {grants.length === 0 && <li className="text-text-tertiary">{"// none"}</li>}
                {grants.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <span className="min-w-0">
                      <span className={g.source === "override" ? "text-accent" : "text-text-tertiary"}>
                        {g.source === "override" ? "override" : "role"}
                      </span>{" "}
                      <span className="text-text-primary">{g.key}</span>{" "}
                      <span className="text-text-secondary">{g.scope}</span>
                      {g.groupId && <span className="text-text-tertiary"> @ {groupName(g.groupId)}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setGrants((all) => all.filter((x) => x.id !== g.id));
                        setScenario(null);
                      }}
                      aria-label={`Remove grant ${g.key} ${g.scope}`}
                      className="shrink-0 px-1 text-text-tertiary hover:text-accent"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select aria-label="Grant source" className={selectCls} value={draftSource} onChange={(e) => setDraftSource(e.target.value as GrantSource)}>
                  <option value="role">role</option>
                  <option value="override">override</option>
                </select>
                <select
                  aria-label="Grant key"
                  className={selectCls}
                  value={draftKey}
                  onChange={(e) => {
                    const k = e.target.value as KeyId;
                    setDraftKey(k);
                    setDraftScope(keyDef(k).scopes[0]);
                  }}
                >
                  {KEYS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.id}
                    </option>
                  ))}
                </select>
                <select aria-label="Grant scope" className={selectCls} value={draftScope} onChange={(e) => setDraftScope(e.target.value as Scope)}>
                  {draftScopes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Grant target group"
                  className={selectCls}
                  value={draftGroup}
                  disabled={draftScope === "GLOBAL"}
                  onChange={(e) => setDraftGroup(e.target.value)}
                >
                  {GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addGrant}
                  className="border border-text-primary px-3 py-1.5 font-mono text-xs text-text-primary transition-colors hover:bg-text-primary hover:text-inverse-text"
                >
                  + grant
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-text-tertiary">
                Overrides only ever add access; there are no deny rules. NODE / SUBTREE apply to the
                group itself, GROUP_NODE / GROUP_SUBTREE to what&apos;s inside it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
