# Design: Pluggable issue-management backend + unified work-item model

**Date:** 2026-06-20
**Status:** Approved (design); decomposed into phases for implementation
**Topic:** Make Maestro work with any issue-management workflow, and move conductor/track state into actual issue management

---

## 1. Problem & goal

Maestro has effectively **built its own issue tracker out of flat files**, in two parallel stores:

- **`conductor/`** holds two unrelated things: *project context* (`product.md`, `tech-stack.md`, `workflow.md`, `product-guidelines.md`, `code_styleguides/`) and *track state* (the `tracks.md` registry plus per-track `conductor/tracks/{id}/` directories containing `spec.md`, `design.md`, `plan.md`, `metadata.json`).
- **`issues/`** holds a second, lighter work-item system: `INBOX.md` → structured `YYYY-MM-DD-slug.md` files with a frontmatter state machine (`triaged → reviewed → tracked | implemented | wont-fix | deferred | duplicate`).

A whole skill — `/issue-advance` — exists only to *convert* an issue into a track. That conversion is the core duplication: **tracks and issues are two representations of the same concept — "a unit of work."**

The blast radius today: ~85 `conductor/` references across 13 files and ~54 `issues/` references across 17 files, with hard-coded paths, YAML frontmatter parsing, and checkbox-markdown parsing woven through nearly every skill.

**Goals, in priority order:**

1. **Kill the duplication.** Collapse tracks + issues into one work-item model.
2. **Make the backend pluggable.** Let skills drive any issue tracker — flat files (default), Gitea, GitHub, GitLab, Linear/Jira — through a single contract, without per-backend skill edits.
3. **Move work-item state into the tracker**, while keeping rich prose artifacts and project memory as git-versioned repo files (hybrid).

---

## 2. Architecture: one work item, three layers

### 2.1 The reframe — one weighted Work Item

Collapse the two entities into a single **Work Item** with a `weight`:

- A **light** work item == today's issue (a bug, a small chore).
- A **tracked** work item == a light item that *grew* a spec + design + plan + phased progress.
- "Advancing" is no longer a conversion between entities — it is **attaching a spec+plan to an item and moving its status forward**. Same item, same ID, from raw capture to done.

One entity. One status machine. One ID per piece of work. `/issue-advance`'s job becomes "promote this item to `weight: tracked`," not "create a different kind of object."

### 2.2 The three layers

```
┌─ Maestro skills ─ triage · review · implement · status · manage · uat · wrap-up
│     speak ONLY in abstract operations + canonical statuses. Never name a backend.
├─ Adapter CONTRACT ─ 12 operations every backend must implement (see §4)
├─ Active ADAPTER PROFILE ─ one markdown file, selected in .maestro/config.json
│     files · gitea · github · gitlab · linear-jira
└─ Backend ─ flat files │ git-forge API/CLI │ Linear/Jira API
```

A skill calls `set_status(item, reviewed)`. It reads the active adapter profile, which contains the *recipe* for that op on that backend. **Adding a backend = writing one profile. Zero skill edits.**

### 2.3 What moves vs. what stays

| Concern | Today | After |
|---|---|---|
| Work-item registry | `tracks.md` + `issues/*.md` | **Backend** (the tracker is the registry) |
| Item metadata (title/type/priority/status/links) | frontmatter + table rows | **Backend** (labels / fields / native state) |
| Plan **progress** (phases/tasks done) | checkboxes in `plan.md` | **Backend** (sub-issues / task-list) — native, so the board view is real |
| Spec / design / plan **prose** | `conductor/tracks/{id}/*.md` | **Repo**, git-versioned, linked from the item → `.maestro/work/{id}/` |
| Project context (product, tech-stack, workflow, guidelines, styleguides) | `conductor/*.md` | **Repo** → `.maestro/context/` (project memory, *not* issue management) |
| Adapter profiles + config | — | **Repo** → `.maestro/adapters/`, `.maestro/config.json` |

---

## 3. Canonical status model + backend mapping

### 3.1 One state machine for every work item

```
        ┌─────────── light item path ───────────┐
inbox → triaged → reviewed ─────────────────→ in-progress → done
                     │                              ↑
                     └──→ planned ──────────────────┘   ← tracked item path
                                              (in-review optional, before done)

   close from any active state ↓
        wont-fix   ·   deferred   ·   duplicate
```

- **Core (every item, every backend):** `inbox → triaged → reviewed → in-progress → done`.
- **Tracked-only insert:** `planned` (item has spec+design+plan) and optional `in-review` (code-review / UAT gate).
- **Light items skip** `planned`/`in-review`: `reviewed → in-progress → done` (today's direct-implement path).
- **Closed-without-doing:** `wont-fix`, `deferred` (reopenable), `duplicate`.

This merges today's two lifecycles: `pending/triaged → … → complete/done`, with the issue terminal states folded in. The old `tracked` status disappears — it is now "an item with a `planned`+ status and `weight: tracked`."

### 3.2 Mapping — canonical status → each backend

| Canonical | Flat-files (`status:` frontmatter) | Git-forge: GitHub / Gitea / GitLab | Linear | Jira (typical, remappable) |
|---|---|---|---|---|
| `inbox` | INBOX scratch / `status: inbox` | open + `status:inbox` | Triage | Backlog |
| `triaged` | `status: triaged` | open + `status:triaged` | Backlog | To Do |
| `reviewed` | `status: reviewed` | open + `status:reviewed` | Todo | Selected |
| `planned` | `status: planned` | open + `status:planned` | Todo | To Do |
| `in-progress` | `status: in-progress` | open + `status:in-progress` | In Progress | In Progress |
| `in-review` | `status: in-review` | open + `status:in-review` (or PR open) | In Review | In Review |
| `done` | `status: done` (→ archived) | **closed** + `done` | Done | Done |
| `wont-fix` | `status: wont-fix` (→ archived) | **closed** + `wont-fix` | Canceled | Won't Do |
| `deferred` | `status: deferred` (→ archived) | **closed** + `deferred` (reopen later) | Backlog | Backlog |
| `duplicate` | `status: duplicate` (→ archived) | **closed** + `duplicate` | Duplicate | Duplicate |

GitLab uses **scoped labels** (`status::reviewed`), which are natively mutually-exclusive. GitHub/Gitea use plain `status:reviewed` labels; the adapter enforces exclusivity by removing sibling `status:*` labels on each transition.

### 3.3 Three rules

1. **Source of truth.** On git-forge, the `status:*` **label is authoritative** for fine-grained status; open/closed is *derived* (closed iff status ∈ {done, wont-fix, deferred, duplicate}). `set_status` updates both atomically. On Linear/Jira the native state is authoritative. On files, the frontmatter field is authoritative.
2. **The remap escape hatch.** Jira/Linear workflows are per-team and custom. `config.statusMap` remaps canonical → native names (`{ "reviewed": "Selected for Dev" }`) so a user fits Maestro to *their* board without editing any skill. This is the literal mechanism for "works with any issue-management workflow."
3. **Fields, not just status.** `type` (bug/feature/refactor/chore) → `type:*` label or native issue-type; `priority` (P1/P2/P3) → `priority:*` label or native priority; `weight` (light/tracked) → presence of a plan/sub-issues (or a `maestro:tracked` label). Same canonical→native mapping pattern, via `config.fieldMap`.

---

## 4. The adapter contract (12 operations)

Every adapter profile is one markdown file implementing these ops as concrete recipes. Skills call them abstractly.

### 4.1 Operations

**CRUD + lifecycle (required — every backend):**

| Op | Purpose | Called by |
|---|---|---|
| `create_item({title,type,priority,body,weight})` → `id` | Births a structured work item | triage, new-track |
| `get_item(id)` → record | Fetch one normalized record | nearly all |
| `update_item(id,{fields})` | Set title/type/priority/weight/body | triage, manage |
| `set_status(id, canonical)` | Transition op — maps to label+state / native state; enforces exclusivity & open/close | every lifecycle skill |
| `list_items({status?,type?,priority?,weight?})` → records | Board / batch / "find done items" | status, issue-review (batch), uat-create |

**Plan progress (required for *tracked* items; light items never call them):**

| Op | Purpose | Called by |
|---|---|---|
| `set_subtasks(id, [task])` | Establish the plan as sub-issues / task-list (native progress) | new-track (after plan written) |
| `set_subtask_state(id, ref, state)` | Mark a plan task `todo·doing·done` | implement |

**Artifacts / comms / relations:**

| Op | Required? | Purpose | Fallback if unsupported |
|---|---|---|---|
| `link_artifact(id, kind, ref)` | required | Link spec/design/plan from the item | append link to body |
| `comment(id, text)` | required | Close reason, findings, wrap-up note | append to body |
| `capture_raw(text)` → handle | optional | Pre-triage inbox capture | local `.maestro/inbox.md` |
| `search(query)` → candidates | optional | Dedup / similar-work | `list_items` + local match |
| `relate(id, kind, target)` | optional | `duplicate-of` · `blocked-by` · `parent` | a `comment` ("duplicate of #X") |

12 ops total. The split:

- **5 always-required CRUD core** — `create_item`, `get_item`, `update_item`, `set_status`, `list_items`. A backend implementing only these supports the full *light-item* workflow.
- **2 required-for-tracked** — `set_subtasks`, `set_subtask_state`. Needed only by tracked items (native plan progress); light items never call them.
- **2 required-but-degradable** — `link_artifact`, `comment` — both fall back to appending to the item body, so they always "work" even on a thin backend.
- **3 fully optional** — `capture_raw`, `search`, `relate` — each has a defined fallback (local scratch, list+match, a comment).

Net: a minimal backend (the 5 core) is usable; tracked features and niceties layer on as the backend supports them.

### 4.2 The normalized record (anti-corruption layer)

`get_item` / `list_items` always return this shape, whatever the backend:

```jsonc
{
  "id": "...", "title": "...", "url": "...",
  "type": "bug|feature|refactor|chore",
  "priority": "P1|P2|P3",
  "status": "reviewed",            // canonical, never backend-native
  "weight": "light|tracked",
  "artifacts": [{ "kind": "spec",  "ref": ".maestro/work/42/spec.md" }],
  "subtasks":  [{ "ref": "...", "title": "Phase 2: endpoints", "state": "doing" }],
  "links":     [{ "kind": "duplicate-of", "target": "#17" }],
  "created": "...", "updated": "..."
}
```

Skills only ever read this shape. The adapter translates in and out.

### 4.3 Capability flags

Each profile declares native capabilities so skills pick the best representation and skip what is absent:

```jsonc
// gitea profile header
{ "supports": ["labels", "subissues", "relations"], "scoped_labels": false }
```

`set_status(id, "reviewed")` rendered three ways from the *same* skill call:

- **files** → rewrite the `status:` frontmatter field; move the file if terminal.
- **github** → remove sibling `status:*` labels, add `status:reviewed` (gh CLI / MCP); close + reason-label iff terminal.
- **linear** → transition the issue to the mapped workflow state (`reviewed → "Todo"`) via API.

### 4.4 Access-method resolution: MCP > CLI > API

An adapter is not tied to one transport. Each profile documents how to perform its ops over **every transport it supports**, and the adapter **auto-selects the best available at runtime**, in this preference order:

1. **MCP** — if the relevant MCP server is connected (e.g. the Gitea MCP, a GitHub/Linear/Jira MCP), use its tools. Preferred: structured, typed, no shell/auth plumbing.
2. **CLI** — else if the tool is on `PATH` and authenticated (`gh auth status`, `tea login list`, `glab auth status`), shell out.
3. **API** — else fall back to raw REST/GraphQL with a token from `config.backend` or env.

The *same* abstract op resolves to whichever transport is live — e.g. `set_status` →
`mcp__gitea__issue_write` **or** `tea issues edit …` **or** `curl … /api/v1/repos/{repo}/issues/{n}`.
In this very environment, the Gitea MCP is loaded, so the `gitea` adapter would select **MCP** with no extra setup.

Each profile therefore carries a small **transport block** per op (or a shared one where the mapping is uniform), and a **detection recipe** Maestro runs once per session to decide which transport is active. `config` may pin a transport (`"transport": "cli"`) to override auto-detection.

---

## 5. Repo layout, identity, and offline capture

### 5.1 One operational home: `.maestro/`

```
.maestro/
  config.json              # adapter choice + connection + remaps + options
  adapters/
    files.md               # default reference adapter (zero deps)
    gitea.md  github.md  gitlab.md  linear-jira.md
  context/                 # PROJECT MEMORY (was conductor/*.md)
    product.md  tech-stack.md  workflow.md  guidelines.md
    styleguides/{markdown,bash,json}.md
  work/                    # PROSE ARTIFACTS, keyed by work-item id (hybrid: always in repo)
    {id}/  spec.md  design.md  plan.md
  items/                   # FILES-ADAPTER ONLY: the work-item registry
    {id}.md                #   one record: frontmatter + body (light items live entirely here)
    archived/{reason}/{id}.md
  inbox.md                 # pre-triage scratch (offline capture, all adapters)
```

- **`context/`** = today's `conductor/*.md`, relocated. Project memory; stays in git.
- **`work/{id}/`** = the prose spec/design/plan. **Always in the repo for every adapter** — the hybrid promise. The tracker links to these.
- **`items/`** = used **only by the files adapter** (its local registry). For Gitea/GitHub/GitLab/Linear/Jira the registry *is the tracker*, so `items/` is not created.
- `conductor/` and `issues/` disappear (migrated — see §6).

### 5.2 Work-item identity

**Canonical ID = whatever the backend uses.**

- Trackers: the native id/key — `42`, `ENG-123`. (Adapter sanitizes any `/` for the `work/{id}/` path.)
- Files adapter: a Maestro-minted `{seq}-{slug}` — e.g. `0042-user-auth` (replaces today's `name_YYYYMMDD`; sortable, slug stays readable).

**Loose-ref resolution:** skills accept a slug, an id, or a URL — `get_item` takes a loose ref and the adapter normalizes it. So `/implement user-auth` still works; it resolves to `#42` under the hood. This preserves today's friendly UX across every backend.

### 5.3 Offline capture — the inbox stays local by default

`capture_raw(text)` writes to a local **`.maestro/inbox.md`** scratch for *all* adapters. Capturing a fleeting idea or a code-review finding must be instant and offline — no network round-trip for a half-formed thought. **Triage is the single birth point**: it reads `inbox.md` and calls `create_item` into whatever backend. So `session-wrap-up`, `codebase-review`, and `uat-run` all dump findings to `inbox.md`, and a later `/triage` promotes them — identical flow regardless of backend.

Escape hatch for "everything in the tracker now" teams: `config.captureMode: "backend"` makes `capture_raw` create a draft `status:inbox` issue directly.

### 5.4 Config (`.maestro/config.json`)

```jsonc
{
  "adapter": "gitea",
  "backend": { "repo": "owner/name", "url": "https://git.example.com" },
  "statusMap": { "reviewed": "Selected for Dev", "done": "Closed" },   // Jira/Linear remaps
  "fieldMap":  { "priority": { "P1": "Urgent", "P2": "High", "P3": "Low" } },
  "captureMode": "local",        // local | backend
  "artifactsDir": ".maestro/work"
}
```

---

## 6. Phase decomposition + migration

The whole vision is captured here; each phase is independently shippable and becomes its own implementation plan.

### 6.1 Phases

| Phase | Scope | Ships | Depends on |
|---|---|---|---|
| **P0 — Foundations** | Unified Work-Item model + canonical status machine + the 12-op contract + normalized record + the **`files` adapter** + refactor **all skills** to abstract ops + `.maestro/` layout | The duplication kill. Fully usable on the files backend (today's UX, one model) | — |
| **P1 — Migration & back-compat** | One-shot migrator `conductor/`+`issues/` → `.maestro/`; status remap; update `bin/setup-project`, hooks, `README.md`, `codex/INSTALL.md`, `AGENTS.md`; migrate Maestro's own dogfooding | Existing users upgrade cleanly | P0 |
| **P2 — Git-forge adapters** | `gitea` + `github` + `gitlab` (one shared profile shape); `/setup` gains backend pick + connection + label bootstrap (`status:*` / `type:*` / `priority:*`) | Real trackers, the common case | P0 |
| **P3 — Linear/Jira adapter** | Native workflow-state mapping via `statusMap`; native priority/type via `fieldMap`; relations; per-team custom-workflow handling | Rich-tracker case; proves "any workflow" | P0; patterns from P2 |
| **P4 — Polish** | Degradation hardening for thin backends; validation suite + hooks rework; per-adapter docs + "write-your-own-adapter" guide; Codex `agents/openai.yaml` parity | Production-ready, documented | P0–P3 |

```
P0 ──┬── P1   (migration; files-only, can run parallel to P2)
     ├── P2 ── P3   (adapters; Linear/Jira reuses git-forge patterns)
     └────────────── P4 (depends on all)
```

**P0 + P1 alone deliver the #1 prize** — duplication gone, one model, on the built-in files backend. P2–P4 are purely additive.

### 6.2 Migration mapping (P1)

| Legacy | New |
|---|---|
| `conductor/{product,tech-stack,workflow,product-guidelines}.md`, `code_styleguides/` | `.maestro/context/…` (move; `product-guidelines.md` → `guidelines.md`) |
| `conductor/tracks/{id}/` (metadata.json + prose) | `.maestro/items/{id}.md` (record) + `.maestro/work/{id}/{spec,design,plan}.md`; `weight: tracked`; status `pending→planned`, `in_progress→in-progress`, `complete→done` |
| `conductor/tracks/_archive/{id}/` | `.maestro/items/archived/done/{id}.md` + `work/{id}/` |
| `issues/*.md` (open) | `.maestro/items/{id}.md`; `weight: light`; status verbatim |
| `issues/archived/{reason}/*` | `.maestro/items/archived/{reason}/*` |
| `issues/INBOX.md` bullets | `.maestro/inbox.md` |

**The one subtle merge:** today an *advanced* issue (`status: tracked`, `advanced-to: X`) and its track `X` are **two files for one piece of work**. Migration **merges them into a single item** (the track becomes the item; the issue's origin folds in as a body note). This is the duplication kill made literal in the data.

**Back-compat stance:** migration is a **mandatory one-shot** with a **dry-run preview** — no permanent dual-read legacy shim (avoids long-term cruft). If `.maestro/` is absent but legacy dirs exist, `/setup` and `bin/setup-project` detect it and offer to migrate.

---

## 7. Skill-by-skill impact (reference for planning)

How each skill changes from path-coupled to contract-driven. Detailed per-skill steps belong in the phase plans.

| Skill | Today | After (abstract ops) |
|---|---|---|
| `setup` | writes `conductor/*` + `setup_state.json` | writes `.maestro/context/*` + `config.json`; in P2 adds backend selection + connection + label bootstrap |
| `triage` | `INBOX.md` → `issues/*.md` | read `.maestro/inbox.md` → `create_item` (+ `search` dedup) |
| `issue-review` | edits `issues/*.md`, sets `reviewed` | `get_item` → enrich body/artifacts → `set_status(reviewed)` |
| `issue-advance` | creates a track, moves issue file | `link_artifact(spec/design/plan)` + `set_subtasks` + `update_item(weight: tracked)` + `set_status(planned)` — same item, no conversion |
| `new-track` | writes `conductor/tracks/{id}/*` | `create_item(weight: tracked)` (or promote existing) + write prose to `.maestro/work/{id}/` + `link_artifact` + `set_subtasks` |
| `implement` | parses `plan.md` checkboxes, edits `metadata.json`, archives issue | `get_item` → `set_status(in-progress)` → per task `set_subtask_state` → `set_status(in-review/done)`; findings via `capture_raw` |
| `status` | parses `tracks.md` + `metadata.json` + `issues/*` | `list_items` (+ counts by status/priority) |
| `manage` | moves track dirs, edits `tracks.md` | `set_status` (archive/restore = terminal/reopen) + `update_item` (rename) ; cleanup via `list_items` |
| `issue-close` | moves file to `archived/{reason}` | `set_status(wont-fix/deferred/duplicate)` + `relate(duplicate-of)` + `comment` |
| `uat-create` / `uat-run` | scan `conductor/`, write `conductor/UAT-*.md`, append `INBOX.md` | `list_items({status: done})`; UAT checklist stays a repo artifact; failures via `capture_raw` |
| `session-wrap-up` | edits `tracks.md`, `INBOX.md`, context | `list_items` + `set_status`/`set_subtask_state` + `capture_raw`; context updates unchanged |
| `workflow-router` | checks `conductor/` / `issues/` existence | checks `.maestro/config.json` + adapter capabilities |
| `codebase-review` | appends `INBOX.md` | `capture_raw` |
| `agents-md-sync` | unaffected | unaffected |

---

## 8. Risks & open questions for planning

- **Sub-task granularity vs. plan detail.** The tracker holds coarse progress (one checklist item / sub-issue per plan *task*); the repo `plan.md` holds the detailed TDD steps. The `implement` skill keeps them aligned: tracker is source of truth for *status*, `plan.md` for *steps*. Plans must define the granularity rule precisely.
- **Auth / connection (resolved — see §4.4).** Adapters auto-select transport in preference order **MCP > CLI > API**, detected once per session, overridable via `config.transport`. Remaining planning detail: the exact per-backend detection recipes and the graceful-failure message when no transport is available/authenticated.
- **Label bootstrap idempotency.** Creating `status:*` / `type:*` / `priority:*` labels in a fresh repo must be safe to re-run.
- **Migration of in-flight work.** The one-shot migrator must handle partially-complete tracks and the advanced-issue+track merge without losing history; the dry-run preview is the safety valve.
- **Codex parity.** Each adapter and skill change must keep `agents/openai.yaml` metadata and the cross-harness manifests aligned (per `AGENTS.md` edit rules).
```
