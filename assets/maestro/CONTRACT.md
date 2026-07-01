# Maestro Adapter Contract

Skills speak ONLY the operations and canonical statuses below. A backend is supported by writing one adapter profile under `.maestro/adapters/` that implements these ops. Adding a backend requires zero skill edits.

## Canonical statuses (closed set)
inbox · triaged · reviewed · planned · in-progress · in-review · done · wont-fix · deferred · duplicate

State machine:
- Core (every item): inbox → triaged → reviewed → in-progress → done
- Tracked insert: reviewed → planned → in-progress → (in-review) → done
- Light items skip planned/in-review.
- Close from any active state: wont-fix · deferred (reopenable) · duplicate

### Status → backend mapping

| Canonical    | Flat-files (`status:` frontmatter)   | GitHub / Gitea / GitLab              | Linear    | Jira (typical, remappable) |
|---|---|---|---|---|
| `inbox`      | INBOX scratch / `status: inbox`      | open + `status:inbox`                | Triage    | Backlog                    |
| `triaged`    | `status: triaged`                    | open + `status:triaged`              | Backlog   | To Do                      |
| `reviewed`   | `status: reviewed`                   | open + `status:reviewed`             | Todo      | Selected for Development    |
| `planned`    | `status: planned`                    | open + `status:planned`              | Todo      | To Do                      |
| `in-progress`| `status: in-progress`               | open + `status:in-progress`          | In Progress | In Progress              |
| `in-review`  | `status: in-review`                 | open + `status:in-review` (or PR open) | In Review | In Review               |
| `done`       | `status: done` (→ archived)          | **closed** + `done`                  | Done      | Done                       |
| `wont-fix`   | `status: wont-fix` (→ archived)      | **closed** + `wont-fix`              | Canceled  | Won't Do                   |
| `deferred`   | `status: deferred` (→ archived)      | **closed** + `deferred` (reopen later) | Backlog | Backlog                  |
| `duplicate`  | `status: duplicate` (→ archived)     | **closed** + `duplicate`             | Duplicate | Duplicate                  |

GitLab uses **scoped labels** (`status::reviewed`), which are natively mutually-exclusive. GitHub/Gitea use plain `status:reviewed` labels; the adapter enforces exclusivity by removing sibling `status:*` labels on each transition.

### Three rules

1. **Source of truth.** On git-forge, the `status:*` label is authoritative for fine-grained status; open/closed is derived (closed iff status ∈ {done, wont-fix, deferred, duplicate}). `set_status` updates both atomically. On Linear/Jira the native state is authoritative. On files, the frontmatter field is authoritative.
2. **The remap escape hatch.** Jira/Linear workflows are per-team and custom. `config.statusMap` remaps canonical → native names (`{ "reviewed": "Selected for Dev" }`) so a user fits Maestro to their board without editing any skill.
3. **Fields, not just status.** `type` (bug/feature/refactor/chore) → `type:*` label or native issue-type; `priority` (P1/P2/P3) → `priority:*` label or native priority; `weight` (light/tracked) → presence of a plan/sub-issues (or a `maestro:tracked` label). Same canonical→native mapping pattern, via `config.fieldMap`. `area` (free-form, project-defined — no closed enum) → `area:*` label, ONLY on adapters that declare the `area` capability token; it does not use `config.fieldMap` since there is no native-name remapping to do. Adapters that don't declare `area` simply never populate or accept it.

## Op execution protocol

To perform ANY operation below, the executing agent:
1. Reads `.maestro/config.json` and takes the `adapter` field (default `files`).
2. Loads the matching profile `.maestro/adapters/<adapter>.md`.
3. Follows that profile's recipe for the op, resolving transport per "Transport resolution" below.

Skills never hard-code an adapter name or a transport — they call the abstract op, and the active profile decides how it is carried out.

## The 12 operations

### CRUD + lifecycle (required — every backend)
- `create_item({title,type,priority,body,weight,area?})` → `id`
- `get_item(ref)` → record            # ref = id | slug | url
- `update_item(id,{fields})`           # title/type/priority/weight/body/area
- `set_status(id, canonical)`          # maps to native; enforces exclusivity & open/close
- `list_items({status?,type?,priority?,weight?,area?})` → [record]

### Plan progress (required for tracked items)
- `set_subtasks(id, [task])`           # task = {ref,title,state}
- `set_subtask_state(id, ref, state)`  # state = todo | doing | done

### Artifacts / comms / relations
- `link_artifact(id, kind, ref)`       # required; fallback: append link to body
- `comment(id, text)`                  # required; fallback: append to body
- `capture_raw(text)` → handle         # optional; fallback: local .maestro/inbox.md
- `search(query)` → [candidate]        # optional; fallback: list_items + local match
- `relate(id, kind, target)`           # optional; fallback: comment

### Callers per operation

| Op | Called by |
|---|---|
| `create_item` | triage, track-new |
| `get_item` | implement, item-advance, item-close, item-review, manage, status, uat-create |
| `update_item` | item-advance, item-review, manage |
| `set_status` | implement, item-advance, item-close, item-review, manage, track-new, session-wrap-up, triage |
| `list_items` | implement, item-advance, item-review, manage, session-wrap-up, status, uat-create |
| `set_subtasks` | item-advance, track-new |
| `set_subtask_state` | implement, session-wrap-up |
| `link_artifact` | item-advance, track-new |
| `comment` | implement, item-advance, item-close, manage |
| `capture_raw` | codebase-review, implement, session-wrap-up, uat-run |
| `search` | item-review, triage |
| `relate` | item-close, triage |

## Normalized record (anti-corruption layer — every get_item/list_items returns this)

```jsonc
{
  "id": "...", "title": "...", "url": "...",
  "type": "bug|feature|refactor|chore",
  "priority": "P1|P2|P3",
  "status": "reviewed",            // canonical, never backend-native
  "weight": "light|tracked",
  "area": "ci",                    // optional, free-form; null/absent if unset or adapter doesn't support it
  "artifacts": [{ "kind": "spec",  "ref": ".maestro/work/42/spec.md" }],
  "subtasks":  [{ "ref": "...", "title": "Phase 2: endpoints", "state": "doing" }],
  "links":     [{ "kind": "duplicate-of", "target": "#17" }],
  "created": "...", "updated": "..."
}
```

Short form: `{ id, title, url, type, priority, status (canonical), weight (light|tracked), area (optional, free-form), artifacts:[{kind,ref}], subtasks:[{ref,title,state}], links:[{kind,target}], created, updated }`

Skills only ever read this shape. The adapter translates in and out.

## Capability flags (each profile declares them in its header)

```jsonc
{ "supports": ["labels"|"subissues"|"subtasks"|"relations"|"area"|...], "scoped_labels": bool, "transports": [...] }
```

Example (gitea profile header):
```jsonc
{ "supports": ["labels", "relations", "subtasks-as-tasklist", "area"], "scoped_labels": false, "transports": ["mcp","cli","api"] }
```

`area` — the adapter can set/read a free-form `area` classification (see `## Config keys`
and the adapter's own `## Field mapping` section for how it's represented). Optional: adapters
that omit this token don't accept or return `area` at all — skills must not assume it's
settable unless the active adapter declares it.

`set_status(id, "reviewed")` rendered three ways from the same skill call:
- **files** → rewrite the `status:` frontmatter field; move the file if terminal.
- **github** → remove sibling `status:*` labels, add `status:reviewed` (gh CLI / MCP); close + reason-label iff terminal.
- **linear** → transition the issue to the mapped workflow state (`reviewed → "Todo"`) via API.

## Transport resolution (preference order)

1. MCP — if the relevant MCP server is connected, use its tools.
2. CLI — else if the tool is on PATH and authenticated, shell out.
3. API — else raw REST/GraphQL with a token from config.backend or env.

Detected once per session. `config.transport` pins a choice and overrides auto-detection.

The same abstract op resolves to whichever transport is live — e.g. `set_status` → `mcp__gitea__issue_write` **or** `tea issues edit …` **or** `curl … /api/v1/repos/{repo}/issues/{n}`.

Each profile carries a transport block per op (or a shared one where the mapping is uniform), and a detection recipe Maestro runs once per session to decide which transport is active.

## Op-required matrix

- 5 always-required core: `create_item`, `get_item`, `update_item`, `set_status`, `list_items`
  A backend implementing only these supports the full *light-item* workflow.
- 2 required for tracked: `set_subtasks`, `set_subtask_state`
  Needed only by tracked items (native plan progress); light items never call them.
- 2 required-but-degradable: `link_artifact`, `comment` (fall back to body append)
  Both always "work" even on a thin backend.
- 3 optional: `capture_raw`, `search`, `relate` (each has a defined fallback)
  - `capture_raw` fallback: local `.maestro/inbox.md`
  - `search` fallback: `list_items` + local match
  - `relate` fallback: a `comment` (e.g. "duplicate of #X")

Net: a minimal backend (the 5 core) is usable; tracked features and niceties layer on as the backend supports them.

## Config keys (.maestro/config.json)
- adapter: files | gitea | github | gitlab | linear | jira
- backend: { kind?, repo?, url?, token?, project_id?, team?, project?, email?, stateCache? }  (forge/native connection. kind: linear|jira (same value as adapter; the linear-jira profile branches on it). repo: github/gitea owner/name. project_id: GitLab project numeric id or path (gitlab MCP/REST). team: Linear team key. project: Jira project key. email: Jira account email. stateCache: linear/jira discovered native states + Jira transition ids, written by /setup and read by set_status/set_subtask_state)
- statusMap: { <canonical>: <native name> }   (remap escape hatch)
- fieldMap: { priority: {...}, type: {...} }   (area does NOT use fieldMap — see Rule 3; it's a free-form label with no native-name remapping)
- captureMode: local | backend
- transport: mcp | cli | api   (optional; pins transport, overrides detection)
- artifactsDir: .maestro/work

### Adapter-name resolution
- adapter `files` -> adapters/files.md
- adapter `gitea|github|gitlab` -> adapters/<name>.md
- adapter `linear|jira` -> adapters/linear-jira.md (profile branches on the name)

## Degradation

Capability flags (profile header `supports`) drive behavior. Rules:

1. Degradable required ops:
   - link_artifact: if no native artifact field -> append `- <kind>: <ref>` under `## Artifacts` in the body, OR post it as a comment/note where that is the backend's idiomatic body-extension surface (e.g. github/gitlab use a comment so the link is timestamped and surfaced in the UI; gitea/files use the body `## Artifacts` block).
   - comment: if no native comments -> append the text under `## Notes` in the body.
2. Optional ops:
   - capture_raw: captureMode=backend needs create_item; if the backend can't, use local .maestro/inbox.md.
   - search: if no native search -> list_items + case-insensitive local match.
   - relate: if no native relations -> a comment ("duplicate-of #X") + set_status(duplicate) for duplicates.
3. set_subtasks/set_subtask_state for a TRACKED item:
   - prefer native sub-issues (supports: subissues); else a native subtask store (supports: subtasks —
     e.g. the files adapter's `## Tasks` checklist); else a `- [ ]` task-list in the issue body
     (supports: subtasks-as-tasklist); if NONE is possible, STOP and tell the user this backend cannot
     track plan progress natively — offer to keep the item `light` (steps live only in .maestro/work/<id>/plan.md).
4. No transport available (detection yields none): STOP. Print which of MCP/CLI/API to configure and the
   one-line auth command for each. NEVER fall back to the files adapter silently.
5. Unmapped native status (linear/jira read path): report `inbox` + warn; prompt to add to config.statusMap.
