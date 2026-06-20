# P3 — Linear/Jira Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native-tracker adapter covering **Linear** and **Jira**, mapping Maestro's canonical statuses onto each team's *custom* workflow states via the `statusMap` remap escape hatch, native priority/type via `fieldMap`, and native sub-issues/relations — proving Maestro fits "any issue-management workflow," not just label-based forges.

**Architecture:** One profile, `assets/maestro/adapters/linear-jira.md`, branching on the active adapter name (`linear` or `jira`). It follows the P2 `_shape.md` contract but its `set_status` does **native workflow-state transitions** instead of label swaps. The crux is a four-tier state-resolution rule (config.statusMap → default table → discovered-state fuzzy match → ask the user) plus a `/setup`-time **state-discovery** step that introspects the team's actual states and writes a `statusMap`. Skills remain unchanged — they still call `set_status(id, reviewed)`; the profile decides that "reviewed" means this team's "Selected for Dev."

**Tech Stack:** Markdown (profile + setup body), JSON (config `statusMap`/`fieldMap`), and the live transports: Linear MCP (`mcp__linear__*`) / Linear GraphQL API (no official CLI); Jira MCP (`mcp__atlassian__*` / `mcp__jira__*`) / `jira` CLI (ankitpokhrel/jira-cli) / Jira REST. No new package code.

---

## Global Constraints

- **Depends on P0** (contract) and **reuses P2 patterns** (`_shape.md`, transport ladder, the `statusMap`/`fieldMap` keys documented in P2 Task 7). Cite P0 Locked Decisions and P2's `_shape.md` rather than re-deriving.
- **Adapter-name resolution:** `config.adapter ∈ {linear, jira}` both load `assets/maestro/adapters/linear-jira.md`; the profile branches on the adapter name. This is the one place a profile filename ≠ adapter name — document the rule in CONTRACT (Task 1 Step 2).
- **Native states are authoritative** for these backends (spec §3.3 rule 1): the team's workflow state is the source of truth; Maestro's canonical status is derived from it on read and mapped to it on write. `open/closed` is whatever the native state implies.
- **The remap escape hatch is mandatory here** (spec §3.3 rule 2): `config.statusMap` maps canonical → native state name. Jira/Linear workflows are per-team; there is no universal default that always fits.
- **Transport order MCP > CLI > API** (spec §4.4). Linear has **no official CLI** → its ladder is MCP > API(GraphQL). Jira ladder is MCP > CLI(`jira`) > REST.
- **No skill-body edits** beyond `/setup` (the connection/discovery entry point). If a lifecycle skill would need changing, the need belongs in the profile or the statusMap.
- **No live network in required verification.** Structural greps gate. A live smoke test is optional and only runs if a Linear or Jira MCP is connected (this environment has Gitea, not Linear/Jira — so the live test is documented but expected-skipped here).
- **Cross-harness alignment** (`AGENTS.md`): update `README.md` + `codex/INSTALL.md` adapter list; the installer already copies the whole `adapters/` dir.
- **Commits YubiKey-signed; submodule git writes need sandbox disabled.**

### Default canonical → native state table (spec §3.2; overridable per team)

| Canonical | Linear (default) | Jira (typical, remappable) |
|---|---|---|
| `inbox` | Triage | Backlog |
| `triaged` | Backlog | To Do |
| `reviewed` | Todo | Selected for Development |
| `planned` | Todo | To Do |
| `in-progress` | In Progress | In Progress |
| `in-review` | In Review | In Review |
| `done` | Done | Done |
| `wont-fix` | Canceled | Won't Do |
| `deferred` | Backlog | Backlog |
| `duplicate` | Duplicate | Duplicate |

This table is the **tier-2 default**. Tier-1 is `config.statusMap`; when a team's board differs (most do), `/setup` discovery writes a `statusMap` that overrides this.

---

## File Structure

**New package asset:**
- `assets/maestro/adapters/linear-jira.md` — the combined native-tracker profile (Linear + Jira branches).

**Modified:**
- `assets/maestro/CONTRACT.md` — add the adapter-name resolution rule (linear|jira → linear-jira profile).
- `skills/setup/SKILL.md` + `skills/setup/agents/openai.yaml` — extend backend choices with linear/jira; connection; state discovery → statusMap builder; fieldMap capture.
- `README.md`, `codex/INSTALL.md` — adapter list.

**Unchanged:** all lifecycle skill bodies.

---

## Task 1: Linear/Jira profile skeleton + adapter-name resolution rule

**Files:**
- Create: `assets/maestro/adapters/linear-jira.md`
- Modify: `assets/maestro/CONTRACT.md`

**Interfaces:**
- Consumes: `_shape.md` (P2 Task 1), the default state table.
- Produces: a profile with all six required sections (Capabilities, Transport detection, Status mapping, Field mapping, Operations, Label bootstrap→"State setup"), and the documented name-resolution rule.

- [ ] **Step 1: Write the profile shell with both branches**

Create `assets/maestro/adapters/linear-jira.md` following `_shape.md`. Capabilities:
```
{ "supports": ["native-states","subissues","relations","priority-field","type-field"],
  "scoped_labels": false, "transports": ["mcp","api"]  /* +cli for jira */ }
```
Transport detection per `_shape.md`, with backend branches:
- Linear: MCP prefix `mcp__linear__`; no CLI; API = Linear GraphQL (`https://api.linear.app/graphql`, token `config.backend.token`/$LINEAR_API_KEY).
- Jira: MCP prefix `mcp__atlassian__` (or `mcp__jira__`); CLI `jira` (auth: `jira me`); API = Jira REST (`<url>/rest/api/3`, token/email from config/env).

Add a top note:
```markdown
> Adapter name: this profile serves config.adapter `linear` OR `jira`. All recipes below
> branch on the active adapter name. config.backend.kind is the same value (linear|jira).
```

- [ ] **Step 2: Add the resolution rule to CONTRACT**

Append to `assets/maestro/CONTRACT.md` `## Config keys` section:
```markdown
### Adapter-name resolution
- adapter `files` -> adapters/files.md
- adapter `gitea|github|gitlab` -> adapters/<name>.md
- adapter `linear|jira` -> adapters/linear-jira.md (profile branches on the name)
```

- [ ] **Step 3: Verify shape present**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
f=assets/maestro/adapters/linear-jira.md
for s in '## Capabilities' '## Transport detection' '## Status mapping' '## Field mapping' '## Operations'; do
  grep -q "$s" "$f" || echo "MISSING: $s"
done
grep -q 'mcp__linear__' "$f" && grep -Eq 'mcp__atlassian__|mcp__jira__' "$f" && echo "both backends present"
grep -q 'Adapter-name resolution' assets/maestro/CONTRACT.md && echo "resolution rule documented"
echo "skeleton check done"
```
Expected: `both backends present`, `resolution rule documented`, `skeleton check done`, no MISSING lines.

- [ ] **Step 4: Commit**

```bash
git add assets/maestro/adapters/linear-jira.md assets/maestro/CONTRACT.md
git commit -m "feat(p3): linear-jira profile skeleton + adapter-name resolution rule"
```

---

## Task 2: Native-state resolution for `set_status` / `get_item` (the crux)

**Files:**
- Modify: `assets/maestro/adapters/linear-jira.md`

**Interfaces:**
- Produces: the `## Status mapping` + the `set_status`/`get_item` recipes implementing the four-tier resolution. This is the literal mechanism for "any workflow."

- [ ] **Step 1: Write the four-tier resolution rule**

In `## Status mapping`, document the write path (canonical → native) and read path (native → canonical):

````markdown
## Status mapping

### Resolving a canonical status to a native state (write — set_status)
1. **statusMap (tier 1):** if config.statusMap[<canonical>] is set, use that native state name.
2. **default table (tier 2):** else use the default table for this backend (see plan §"Default table").
3. **discovered fuzzy (tier 3):** else case-insensitively match <canonical> (and common synonyms:
   reviewed↔{Selected,Ready}, in-progress↔{In Progress,Doing}, done↔{Done,Closed,Complete})
   against the team's discovered states (cached at setup).
4. **ask (tier 4):** else STOP and ask the user which native state corresponds; offer to persist
   the answer into config.statusMap so it never asks again.

### Resolving a native state to a canonical status (read — get_item/list_items)
- Invert statusMap first; else invert the default table; else fuzzy/synonym match; else report
  status as `inbox` and warn that the native state is unmapped (prompt to add to statusMap).
````

- [ ] **Step 2: Write set_status recipe (both backends)**

````markdown
### set_status(id, canonical)
Resolve canonical -> native (four-tier above). Then transition:
- Linear MCP: mcp__linear__update_issue(id, stateId=<resolved state's id>). (Look up stateId from the
  discovered states; if only a name is known, resolve via mcp__linear__list_issue_statuses.)
- Linear API: GraphQL issueUpdate(input:{stateId}).
- Jira MCP: mcp__atlassian__transition_issue(issueKey, transition=<name/id>) (use the team's transition
  whose target status == resolved native state).
- Jira CLI: `jira issue move <KEY> "<native state>"`.
- Jira API: POST /rest/api/3/issue/<KEY>/transitions {transition:{id}}.
open/closed is implied by the native state; no separate close call needed.
````

- [ ] **Step 3: Write get_item / list_items recipes**

````markdown
### get_item(ref)
- Linear MCP: mcp__linear__get_issue(ref) -> map: identifier->id, title, state.name->canonical (read path),
  priority(0-4)->P1/P2/P3 via fieldMap inverse, labels->type, children->subtasks, relations->links.
- Jira MCP: mcp__atlassian__get_issue(KEY) -> fields.status.name->canonical, fields.priority->P*,
  fields.issuetype->type, subtasks->subtasks, issuelinks->links.
- (CLI/API forms analogous.)
### list_items({status?,...})
- Resolve any status filter to native via the write path, then query:
  Linear: mcp__linear__list_issues(filter:{state}); Jira: `jira issue list -s"<native>"` / JQL `status = "<native>"`.
- Map each result back through the read path. Apply non-status filters (type/priority/weight) after mapping.
````

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
f=assets/maestro/adapters/linear-jira.md
grep -q 'statusMap (tier 1)' "$f" && grep -q 'ask (tier 4)' "$f" && echo "four-tier present"
grep -q '### set_status' "$f" && grep -q 'transition' "$f" && echo "set_status native transition"
grep -q '### get_item' "$f" && grep -q '### list_items' "$f" && echo "read path present"
```
Expected: `four-tier present`, `set_status native transition`, `read path present`.

- [ ] **Step 5: Commit**

```bash
git add assets/maestro/adapters/linear-jira.md
git commit -m "feat(p3): four-tier native-state resolution for set_status/get_item"
```

---

## Task 3: Field mapping, relations, native sub-issues, and the rest of the ops

**Files:**
- Modify: `assets/maestro/adapters/linear-jira.md`

**Interfaces:**
- Produces: the remaining ops (`create_item`, `update_item`, `set_subtasks`, `set_subtask_state`, `link_artifact`, `comment`, `capture_raw`, `search`, `relate`) + `## Field mapping`, using NATIVE sub-issues and relations (richer than forges).

- [ ] **Step 1: Field mapping**

````markdown
## Field mapping
- priority: canonical P1/P2/P3 <-> native via config.fieldMap.priority (default Linear: P1=Urgent(1),
  P2=High(2),P3=Low(4); Jira: P1=Highest,P2=High,P3=Low). Native priority field, not a label.
- type: bug/feature/refactor/chore <-> Linear labels; Jira issuetype (Bug/Story/Task) or label if the
  project lacks those types. Configurable via config.fieldMap.type.
- weight: tracked = has sub-issues OR a `maestro:tracked` label; light = neither.
````

- [ ] **Step 2: create_item / update_item**

````markdown
### create_item({title,type,priority,body,weight})
- Linear MCP: mcp__linear__create_issue(team, title, description=body, priority=<mapped>, labelIds=[type]).
  Set initial state to the native mapping of `inbox`. Return the issue identifier (e.g. ENG-123).
- Jira MCP: mcp__atlassian__create_issue(project, summary=title, description=body, issuetype=<mapped type>,
  priority=<mapped>). Return the key.
### update_item(id,{fields}) -> update title/description/priority/type natively (issue update / edit).
````

- [ ] **Step 3: Native sub-issues + relations**

````markdown
### set_subtasks(id, [task])  (supports: subissues — native, NOT a task-list)
- Linear: create a sub-issue per task (mcp__linear__create_issue with parentId=id, title=task.title);
  cache each sub-issue id against task.ref.
- Jira: create a sub-task per task (issuetype=Sub-task, parent=KEY).
### set_subtask_state(id, ref, state)
- Map state todo/doing/done -> native state of the sub-issue; set_status on the sub-issue.
### relate(id, kind, target)
- Linear: mcp__linear__create_issue_relation(issueId=id, relatedIssueId=target, type=duplicate|blocks|related).
- Jira: POST issueLink {type: Duplicate|Blocks|Relates, inwardIssue, outwardIssue}.
- duplicate-of also triggers set_status(id, duplicate).
### link_artifact(id, kind, ref) -> append `- <kind>: <ref>` under an `## Artifacts` section of the description
  (or a Linear/Jira attachment/link if preferred). comment(id,text) -> native comment.
### capture_raw(text) -> captureMode local: .maestro/inbox.md; backend: create_item at native `inbox` state.
### search(query) -> Linear mcp__linear__list_issues(filter by query) / Jira JQL text~"<query>".
````

- [ ] **Step 4: Verify all 12 ops present**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
f=assets/maestro/adapters/linear-jira.md
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "### $op" "$f" || echo "MISSING OP: $op"
done
grep -q 'subissues' "$f" && grep -q 'create_issue_relation\|issueLink' "$f" && echo "native subissues + relations"
grep -q '## Field mapping' "$f" && grep -q 'fieldMap.priority' "$f" && echo "field mapping present"
echo "ops check done"
```
Expected: `native subissues + relations`, `field mapping present`, `ops check done`, no MISSING lines.

- [ ] **Step 5: Commit**

```bash
git add assets/maestro/adapters/linear-jira.md
git commit -m "feat(p3): field mapping + native sub-issues/relations + remaining ops"
```

---

## Task 4: `/setup` — Linear/Jira connection, state discovery, statusMap/fieldMap builder

**Files:**
- Modify: `skills/setup/SKILL.md`
- Modify: `skills/setup/agents/openai.yaml`

**Interfaces:**
- Consumes: the profile's state-resolution + discovery; transport detection.
- Produces: a setup branch that, for linear/jira, connects, discovers the team's native states, and writes `config.statusMap` + `config.fieldMap` so all later ops "just work" on that team's board.

Current (post-P2): setup offers files/gitea/github/gitlab + connection + label bootstrap + captureMode.

- [ ] **Step 1: Extend the backend choice**

Add `linear` and `jira` to the backend options. On selection, set `config.adapter` accordingly (the profile resolves to `linear-jira.md`).

- [ ] **Step 2: Connection capture**

- Linear: ask team key + API key (or confirm the Linear MCP is connected). Write `config.backend = { kind: "linear", team, token? }`.
- Jira: ask site `url`, project key, email + token (or confirm the Jira MCP). Write `config.backend = { kind: "jira", url, project }`.
- Run transport detection; report MCP/CLI/API resolution (Linear: MCP or API only).

- [ ] **Step 3: State discovery → statusMap builder (the per-team handling)**

Replace forge "label bootstrap" with **state discovery** for linear/jira:
1. List the team's native workflow states (Linear: `mcp__linear__list_issue_statuses`; Jira: GET `/rest/api/3/project/<key>/statuses` or `jira issue list` introspection).
2. For each of the 10 canonical statuses, propose a mapping using the default table + fuzzy/synonym match against discovered states; show the proposed `statusMap` to the user.
3. Let the user correct any line; persist the final `config.statusMap`.
4. Flag any canonical status with no native equivalent (e.g. team has no "In Review") — offer to (a) map it to the nearest state or (b) leave it unmapped (skills that would set it fall back to the adjacent state). Record the decision.

- [ ] **Step 4: fieldMap builder**

Discover native priorities (Linear 0–4 / Jira priority scheme) and issue types; propose `config.fieldMap.priority` (P1/P2/P3 → native) and `config.fieldMap.type`; let the user adjust; persist.

- [ ] **Step 5: openai.yaml + verify**

- description adds "linear/jira" to the backend list.

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -q 'linear' skills/setup/SKILL.md && grep -q 'jira' skills/setup/SKILL.md && echo "native backends offered"
grep -q 'statusMap' skills/setup/SKILL.md && grep -qi 'discover' skills/setup/SKILL.md && echo "state discovery + statusMap"
grep -q 'fieldMap' skills/setup/SKILL.md && echo "fieldMap builder"
! grep -rn 'conductor/' skills/setup && echo "still clean"
```
Expected: `native backends offered`, `state discovery + statusMap`, `fieldMap builder`, `still clean`.

- [ ] **Step 6: Commit**

```bash
git add skills/setup/
git commit -m "feat(p3): setup discovers native states, builds statusMap/fieldMap for linear/jira"
```

---

## Task 5: P3 consistency gate + remap-precedence proof

**Files:**
- Test only. Modify: `README.md`, `codex/INSTALL.md` (adapter list).

**Interfaces:**
- Consumes: everything in P3.
- Produces: green structural gate + documented adapter list; a live smoke test that is expected-skipped in this (Gitea-only) environment.

- [ ] **Step 1: Required structural gate**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
f=assets/maestro/adapters/linear-jira.md
test -f "$f" && echo "profile present"
# all 12 ops + four-tier resolution + native richness:
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "### $op" "$f" || echo "MISSING OP: $op"
done
grep -q 'tier 1' "$f" && grep -q 'tier 4' "$f" && echo "remap precedence present"
# every canonical status referenced in the mapping:
for st in inbox triaged reviewed planned in-progress in-review done wont-fix deferred duplicate; do
  grep -q "$st" "$f" || echo "MISSING STATUS: $st"
done
# skills still abstract — no native tracker names leaked into lifecycle skills:
! grep -rln -e 'mcp__linear' -e 'mcp__atlassian' -e 'jira issue' skills/triage skills/implement skills/status skills/issue-review skills/issue-advance skills/new-track skills/manage skills/issue-close skills/uat-create skills/uat-run skills/session-wrap-up skills/codebase-review skills/workflow-router && echo "skills stay abstract"
echo "p3 gate done"
```
Expected: `profile present`, `remap precedence present`, `skills stay abstract`, `p3 gate done`, no MISSING lines.

- [ ] **Step 2: Remap precedence proof (worked example in the profile)**

Add a short worked example to `linear-jira.md` showing tier-1 winning over tier-2: given `config.statusMap = { "reviewed": "Selected for Dev" }`, `set_status(id, reviewed)` transitions to "Selected for Dev" even though the default table says "Todo"/"Selected for Development". Verify:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -q 'Selected for Dev' assets/maestro/adapters/linear-jira.md && echo "worked example present"
```
Expected: `worked example present`.

- [ ] **Step 3: (Optional) Live smoke — only if a Linear/Jira MCP is connected**

If `mcp__linear__*` or `mcp__atlassian__*` tools are available (NOT in this Gitea-only environment — expected skip): on a throwaway team/project, run state discovery, `create_item`, `set_status(reviewed)` (confirm it lands on the mapped native state), `set_subtasks` (confirm native sub-issues created), `set_status(done)` (confirm native Done + closed). Clean up afterward. If no such MCP is connected, **log "P3 live smoke skipped: no Linear/Jira transport in this environment"** and rely on the structural gate.

- [ ] **Step 4: Docs + commit**

Update `README.md` + `codex/INSTALL.md` adapter list to include `linear` / `jira` (note: requires statusMap from `/setup` discovery). Then:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -q 'linear' README.md && grep -q 'jira' README.md && echo "readme lists native adapters"
git add README.md codex/INSTALL.md assets/maestro/adapters/linear-jira.md
git commit -m "docs(p3): list linear/jira adapters; add remap worked example"
git commit --allow-empty -m "test(p3): linear/jira adapter gate green (live smoke skipped: no native MCP here)"
```

---

## Self-Review (against spec §6.1 P3 row + §3.3)

- **Spec coverage:** "native workflow-state mapping via statusMap" → Task 2 (four-tier, tier-1 = statusMap). "native priority/type via fieldMap" → Task 3 + Task 4 builder. "relations" → Task 3 (native create_issue_relation/issueLink). "per-team custom-workflow handling" → Task 4 state discovery (introspect → propose → user-correct → persist) + Task 2 tier-4 ask-and-persist. Rule 1 native-authoritative (§3.3) → read path inverts native→canonical. Rule 2 remap escape hatch (§3.3) → tier-1 precedence + Task 5 worked example. "proves 'any workflow'" → discovery handles boards with no exact canonical equivalent (Task 4 Step 3 flagging).
- **Placeholder scan:** none — concrete MCP tool names (`mcp__linear__*`, `mcp__atlassian__*`), CLI (`jira issue`), and API endpoints throughout.
- **Type consistency:** op names match the closed set; canonical statuses match; statusMap/fieldMap keys match the config schema documented in P2 Task 7 + CONTRACT.
- **Honesty note:** the live round-trip can't run in this Gitea-only environment; Task 5 Step 3 makes the skip explicit rather than claiming a pass.

## Execution Handoff

**Recommended: Subagent-Driven.** Tasks 1–3 build one file incrementally (do sequentially); Task 4 (`/setup`) is independent and can run alongside; Task 5 is the gate. The native-state resolution (Task 2) is the highest-risk piece — give it a careful reviewer pass.
