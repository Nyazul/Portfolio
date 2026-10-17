// A faithful, simplified port of Generic WorkFlow's authorization rules
// (AuthorizationService + GrantEvaluator), driving <PermissionPlayground/>.
// Same resolution order and scope semantics as the Java code; only the
// data is made up (a small record-group tree and a handful of grants).
//
// Resolution, as in AuthorizationService:
//   1. workspace owner → allow everything
//   2. ADMIN role → allow, unless the action is billing-sensitive
//   3. otherwise: union of role grants and per-user overrides (allow-only,
//      no deny), evaluated by scope against the record-group tree.

export type Scope = "GLOBAL" | "NODE" | "SUBTREE" | "GROUP_NODE" | "GROUP_SUBTREE";
export type Persona = "owner" | "admin" | "member";
export type GrantSource = "role" | "override";

export type KeyId = "record_group:view" | "record:create" | "subscription:change_plan";

export type KeyDef = {
  id: KeyId;
  label: string;
  // How the key relates to the record-group tree (ResourceHierarchy).
  kind: "tree" | "member" | "workspace";
  billingSensitive: boolean;
  scopes: Scope[];
};

export const KEYS: KeyDef[] = [
  {
    id: "record_group:view",
    label: "View a record group",
    kind: "tree",
    billingSensitive: false,
    scopes: ["GLOBAL", "NODE", "SUBTREE"],
  },
  {
    id: "record:create",
    label: "Create records in a group",
    kind: "member",
    billingSensitive: false,
    scopes: ["GLOBAL", "GROUP_NODE", "GROUP_SUBTREE"],
  },
  {
    id: "subscription:change_plan",
    label: "Change the plan",
    kind: "workspace",
    billingSensitive: true,
    scopes: ["GLOBAL"],
  },
];

export const keyDef = (id: KeyId) => KEYS.find((k) => k.id === id)!;

export type Group = { id: string; name: string; parent: string | null };

export const GROUPS: Group[] = [
  { id: "admissions", name: "Admissions", parent: null },
  { id: "intake", name: "2026 intake", parent: "admissions" },
  { id: "shortlisted", name: "Shortlisted", parent: "intake" },
  { id: "alumni", name: "Alumni", parent: "admissions" },
  { id: "sales", name: "Sales", parent: null },
  { id: "leads", name: "Leads", parent: "sales" },
];

export type Grant = {
  id: string;
  key: KeyId;
  scope: Scope;
  // null only for GLOBAL grants.
  groupId: string | null;
  source: GrantSource;
};

export const groupName = (id: string | null) =>
  id ? GROUPS.find((g) => g.id === id)?.name ?? id : "whole workspace";

// [group, parent, grandparent, ...] - ResourceHierarchyLookup.groupAndAncestors
export function groupAndAncestors(id: string): string[] {
  const chain: string[] = [];
  for (let g = GROUPS.find((x) => x.id === id); g; g = GROUPS.find((x) => x.id === g!.parent)) {
    chain.push(g.id);
  }
  return chain;
}

export function descendantsIncludingSelf(id: string): string[] {
  const out = [id];
  for (const g of GROUPS) if (g.parent === id) out.push(...descendantsIncludingSelf(g.id));
  return out;
}

export type TraceLine = { text: string; result?: "pass" | "fail" | "info" };
export type Decision = { allowed: boolean; trace: TraceLine[] };

export function decide(persona: Persona, grants: Grant[], key: KeyId, groupId: string): Decision {
  const def = keyDef(key);
  const trace: TraceLine[] = [];
  const target = def.kind === "workspace" ? "the workspace" : `“${groupName(groupId)}”`;
  trace.push({ text: `hasPermission(${key}) on ${target}`, result: "info" });

  if (persona === "owner") {
    trace.push({ text: "Workspace owner: bypasses every check", result: "pass" });
    return { allowed: true, trace };
  }
  if (persona === "admin") {
    if (!def.billingSensitive) {
      trace.push({ text: "ADMIN role: allowed (action isn't billing-sensitive)", result: "pass" });
      return { allowed: true, trace };
    }
    trace.push({ text: "ADMIN role: no bypass, this action is billing-sensitive", result: "info" });
  } else {
    trace.push({ text: "Not owner or admin: evaluate grants", result: "info" });
  }

  const relevant = grants.filter((g) => g.key === key);
  const roles = relevant.filter((g) => g.source === "role").length;
  const overrides = relevant.length - roles;
  trace.push({
    text: `${relevant.length} grant(s) for ${key}: ${roles} from role, ${overrides} user override(s). Union, allow-only.`,
    result: relevant.length ? "info" : "fail",
  });
  if (relevant.length === 0) return { allowed: false, trace };

  if (relevant.some((g) => g.scope === "GLOBAL")) {
    trace.push({ text: "GLOBAL grant present → allowed everywhere", result: "pass" });
    return { allowed: true, trace };
  }
  if (def.kind === "workspace") {
    trace.push({ text: "Workspace-level action needs a GLOBAL grant", result: "fail" });
    return { allowed: false, trace };
  }

  const chain = groupAndAncestors(groupId);
  const chainNames = chain.map(groupName).join(" → ");
  const has = (scope: Scope, ids: string[]) =>
    relevant.find((g) => g.scope === scope && g.groupId !== null && ids.includes(g.groupId));

  if (def.kind === "tree") {
    const node = has("NODE", [groupId]);
    trace.push({
      text: `NODE grant on “${groupName(groupId)}” itself?`,
      result: node ? "pass" : "fail",
    });
    if (node) return { allowed: true, trace };
    const sub = has("SUBTREE", chain);
    trace.push({
      text: `SUBTREE grant on the group or an ancestor (${chainNames})?${sub ? ` Yes, on “${groupName(sub.groupId)}”` : ""}`,
      result: sub ? "pass" : "fail",
    });
    return { allowed: !!sub, trace };
  }

  // member: "coversGroupMembers"
  const gnode = has("GROUP_NODE", [groupId]);
  trace.push({
    text: `GROUP_NODE grant on “${groupName(groupId)}”?`,
    result: gnode ? "pass" : "fail",
  });
  if (gnode) return { allowed: true, trace };
  const gsub = has("GROUP_SUBTREE", chain);
  trace.push({
    text: `GROUP_SUBTREE grant on the group or an ancestor (${chainNames})?${gsub ? ` Yes, on “${groupName(gsub.groupId)}”` : ""}`,
    result: gsub ? "pass" : "fail",
  });
  return { allowed: !!gsub, trace };
}

// AuthorizationService.traceableRecordGroupIds: groups a user may see by
// name (to navigate the tree) without access to their contents. Derived
// from every tree-related grant: granted groups and all their ancestors,
// plus whole subtrees for SUBTREE / GROUP_SUBTREE grants.
export function traceableGroups(persona: Persona, grants: Grant[]): Set<string> {
  if (persona !== "member") return new Set(GROUPS.map((g) => g.id));
  const treeGrants = grants.filter((g) => keyDef(g.key).kind !== "workspace");
  if (treeGrants.some((g) => g.scope === "GLOBAL")) return new Set(GROUPS.map((g) => g.id));
  const out = new Set<string>();
  for (const g of treeGrants) {
    if (!g.groupId) continue;
    if (g.scope === "SUBTREE" || g.scope === "GROUP_SUBTREE") {
      descendantsIncludingSelf(g.groupId).forEach((id) => out.add(id));
    }
    groupAndAncestors(g.groupId).forEach((id) => out.add(id));
  }
  return out;
}

export type Scenario = { id: string; label: string; persona: Persona; grants: Grant[] };

export const SCENARIOS: Scenario[] = [
  {
    id: "counsellor",
    label: "Admissions counsellor",
    persona: "member",
    grants: [
      { id: "s1", key: "record_group:view", scope: "SUBTREE", groupId: "admissions", source: "role" },
      { id: "s2", key: "record:create", scope: "GROUP_NODE", groupId: "shortlisted", source: "role" },
    ],
  },
  {
    id: "sales-override",
    label: "Sales rep + one override",
    persona: "member",
    grants: [
      { id: "s3", key: "record_group:view", scope: "NODE", groupId: "leads", source: "role" },
      { id: "s4", key: "record:create", scope: "GROUP_SUBTREE", groupId: "sales", source: "override" },
    ],
  },
  { id: "admin", label: "Workspace admin", persona: "admin", grants: [] },
  { id: "owner", label: "Workspace owner", persona: "owner", grants: [] },
];
