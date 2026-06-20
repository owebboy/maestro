# P0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse Maestro's two parallel work-item stores (`conductor/` tracks + `issues/`) into ONE weighted Work Item, define the 12-operation adapter contract + normalized record, ship the built-in **files** adapter, and refactor all 15 skills to speak only abstract operations against `.maestro/` — delivering the full duplication kill on a local backend with today's UX intact.

**Architecture:** Skills call abstract ops (`create_item`, `set_status`, …) and read canonical statuses. They never name a backend or hard-code `conductor/`/`issues/` paths. Each op resolves through the **active adapter profile** named in `.maestro/config.json`. P0 ships exactly one profile — `files` — whose recipes read/write Markdown under `.maestro/`. The contract and the files adapter are authored as package template assets and materialized into a project's `.maestro/` at setup.

**Tech Stack:** Markdown (skills are prompts), Bash (installer + hooks), JSON (config + manifests), YAML frontmatter (item records). No compiler or test framework — verification is JSON/Bash linting, grep-based structural assertions, and frontmatter-field checks (mirroring the existing `bin/hooks/validate-issue-frontmatter.sh` style).

---

## Global Constraints

These apply to every task. Each task's requirements implicitly include this section.

- **Skills are prompts, not code.** A "refactor" means editing Markdown instructions + the skill's `agents/openai.yaml`. Show the exact before/after instruction text for path-coupled lines; do not invent behavior beyond the spec.
- **No skill may hard-code `conductor/` or `issues/` paths** after P0 (the one exception — the migrator — is P1, not built here). Skills reference only abstract ops, canonical statuses, and `.maestro/…` paths.
- **Canonical status vocabulary (closed set):** `inbox`, `triaged`, `reviewed`, `planned`, `in-progress`, `in-review`, `done`, `wont-fix`, `deferred`, `duplicate`. Never emit a backend-native status name from a skill.
- **Op names (closed set of 12):** `create_item`, `get_item`, `update_item`, `set_status`, `list_items`, `set_subtasks`, `set_subtask_state`, `link_artifact`, `comment`, `capture_raw`, `search`, `relate`. Spelled exactly, snake_case, everywhere.
- **Keep cross-harness manifests aligned** per `AGENTS.md`: any skill add/rename touches `README.md`, `codex/INSTALL.md`, `bin/setup-project`, and that skill's `agents/openai.yaml`. (P0 renames no skills; it rewrites bodies. Manifest *content* about behavior must still be updated where it names `conductor/`/`issues/`.)
- **Commits are YubiKey-signed.** If signing fails with `git-sign: no YubiKey detected`, stop and ask the user (do not bypass with `--no-gpg-sign` without explicit OK). `maestro/` is a git submodule — git *write* commands need the sandbox disabled.
- **Validation toolkit (the "tests" for this package):**
  - JSON: `python3 -m json.tool <file> >/dev/null`
  - Bash: `bash -n <file>`
  - Frontmatter field present: `grep -q '^<field>:' <file>`
  - Absence assertion: `! grep -rn '<forbidden>' <dir>` (exit 0 = clean)
  - Existing repo validation block from `AGENTS.md` must still pass.

### Locked Decisions (shared foundation — referenced by P1–P4)

These are the foundational choices P0 establishes. **P1, P2, P3, and P4 reference this section by name** rather than re-deriving.

**LD-1 — `.maestro/` layout and ownership split.**
```
.maestro/
  config.json          # PROJECT-OWNED (committed): adapter choice + connection + remaps + options
  CONTRACT.md          # PACKAGE-MANAGED (copied at setup; refreshable): the 12-op contract reference
  adapters/            # PACKAGE-MANAGED (copied at setup; refreshable)
    files.md           #   the only adapter in P0; gitea/github/gitlab added P2; linear-jira P3
  context/             # PROJECT-OWNED: product.md tech-stack.md workflow.md guidelines.md styleguides/{markdown,bash,json}.md
  work/                # PROJECT-OWNED: <id>/spec.md design.md plan.md  (prose artifacts, every adapter, always in repo)
  items/               # FILES ADAPTER ONLY: <id>.md records + archived/<reason>/<id>.md
  inbox.md             # PROJECT-OWNED: pre-triage scratch (all adapters)
```
`CONTRACT.md` + `adapters/*` are copied from package template assets and are safe to re-copy (idempotent refresh on setup/upgrade). Everything else is authored by the project and committed. For non-files adapters, `items/` is never created (the tracker is the registry); `work/` always exists.

**LD-2 — Package template assets home.** Canonical sources live in the package at `assets/maestro/`:
```
assets/maestro/
  CONTRACT.md
  adapters/files.md
  config.template.json
```
`bin/setup-project` and the `setup` skill copy these into a project's `.maestro/`. Context files are *generated* by `setup` (Q&A), not copied.

**LD-3 — Files-adapter item record format** (`.maestro/items/<id>.md`):
```markdown
---
id: 0042-user-auth
title: User authentication
type: feature          # bug | feature | refactor | chore
priority: P2           # P1 | P2 | P3
status: reviewed       # canonical status (closed set)
weight: light          # light | tracked
created: 2026-06-20
updated: 2026-06-20
artifacts:             # optional; list of {kind, ref}
  - { kind: spec, ref: .maestro/work/0042-user-auth/spec.md }
links:                 # optional; list of {kind, target}
  - { kind: duplicate-of, target: 0017-old-login }
---

# User authentication

## Summary
## Problem Description
## Acceptance Criteria
## Technical Context
### Affected Files
### Related Tests
### Similar Patterns
## Dependencies
## Out of Scope
## Notes

## Tasks            <!-- present only when weight: tracked; the coarse progress mirror -->
- [ ] 1.1 — Scaffold module
- [~] 1.2 — Wire endpoints
- [x] 1.3 — Add migration
```
- **Required frontmatter fields:** `id`, `title`, `type`, `priority`, `status`, `weight`, `created`, `updated`.
- **`## Tasks` checklist** is the files adapter's `subtasks` store (coarse progress, one line per plan task). `[ ]`=todo, `[~]`=doing, `[x]`=done. The detailed TDD steps stay in `.maestro/work/<id>/plan.md`. Task `ref` = the leading token (`1.1`).
- **Light items** never have a `## Tasks` section.

**LD-4 — Identity & loose-ref resolution.** Files-adapter id = `{seq}-{slug}`, zero-padded 4-digit seq + kebab slug (e.g. `0042-user-auth`), replacing the old `name_YYYYMMDD`. `get_item(ref)` accepts a bare id, a slug, or a `work/<id>` path and normalizes: exact `id` match → unique slug-suffix match → error if ambiguous. Seq = (max existing seq across `items/` and `items/archived/`) + 1.

**LD-5 — Canonical status → files-adapter representation.** Status lives in the `status:` frontmatter field. Terminal statuses (`done`, `wont-fix`, `deferred`, `duplicate`) additionally move the file to `.maestro/items/archived/<status>/`. `deferred` is reopenable (move back to `items/`, set non-terminal status). This is the per-backend mapping table's "Flat-files" column (spec §3.2).

**LD-6 — Transport resolution is adapter-internal.** The contract documents the MCP > CLI > API preference order (spec §4.4); the files adapter has a single transport (`files`). P2/P3 adapters implement detection. Skills never choose a transport.

---

## File Structure

**New package assets (source of truth):**
- `assets/maestro/CONTRACT.md` — the 12-op contract, normalized record, status machine, capability flags, transport order.
- `assets/maestro/adapters/files.md` — files-adapter recipes for all 12 ops + LD-3 record format.
- `assets/maestro/config.template.json` — default config (`adapter: files`).

**Rewritten skills (body + `agents/openai.yaml` where behavior text names old paths):**
- `skills/setup/` — writes `.maestro/` instead of `conductor/`; copies contract+adapter+config; generates context.
- `skills/triage/`, `skills/issue-review/`, `skills/issue-advance/`, `skills/new-track/`, `skills/implement/`, `skills/issue-close/` — lifecycle.
- `skills/status/`, `skills/manage/`, `skills/session-wrap-up/`, `skills/workflow-router/` — board/management.
- `skills/uat-create/`, `skills/uat-run/`, `skills/codebase-review/` — capture/quality.
- `skills/agents-md-sync/` — **unaffected** (no conductor/issues coupling; no task).

**Untouched in P0 (changed in P1):** `bin/setup-project` issues scaffold, `bin/hooks/*`, `README.md`, `codex/INSTALL.md`, `AGENTS.md`, plugin manifests, Maestro's own `conductor/`+`issues/` dogfood dirs. P0's `setup` skill targets `.maestro/`; the *installer* migration is P1.

> **Note on `setup` vs installer in P0.** P0 makes the `setup` skill create `.maestro/`. `bin/setup-project` still scaffolds the legacy `issues/` dir until P1 rewrites it. This is intentional: P0 proves the model end-to-end via the skill; P1 handles installer + migration. The P0 consistency gate (Task 17) excludes `bin/` and `hooks/` from its "no legacy paths" assertion for this reason.

---

## Task 1: Canonical contract reference (`CONTRACT.md`)

**Files:**
- Create: `assets/maestro/CONTRACT.md`
- Test: structural greps (below)

**Interfaces:**
- Produces: the authoritative names every skill and adapter cites — 12 op names, 10 canonical statuses, the normalized-record shape, capability-flag keys, transport order. All later tasks and plans cite this file.

- [ ] **Step 1: Write the contract document**

Create `assets/maestro/CONTRACT.md` with these sections (use the spec `docs/specs/2026-06-20-pluggable-issue-backend-design.md` §3–§4 as source; reproduce, don't summarize):

````markdown
# Maestro Adapter Contract

Skills speak ONLY the operations and canonical statuses below. A backend is supported by writing one adapter profile under `.maestro/adapters/` that implements these ops. Adding a backend requires zero skill edits.

## Canonical statuses (closed set)
inbox · triaged · reviewed · planned · in-progress · in-review · done · wont-fix · deferred · duplicate

State machine:
- Core (every item): inbox → triaged → reviewed → in-progress → done
- Tracked insert: reviewed → planned → in-progress → (in-review) → done
- Light items skip planned/in-review.
- Close from any active state: wont-fix · deferred (reopenable) · duplicate

## The 12 operations
### CRUD + lifecycle (required — every backend)
- create_item({title,type,priority,body,weight}) -> id
- get_item(ref) -> record            # ref = id | slug | url
- update_item(id,{fields})           # title/type/priority/weight/body
- set_status(id, canonical)          # maps to native; enforces exclusivity & open/close
- list_items({status?,type?,priority?,weight?}) -> [record]
### Plan progress (required for tracked items)
- set_subtasks(id, [task])           # task = {ref,title,state}
- set_subtask_state(id, ref, state)  # state = todo | doing | done
### Artifacts / comms / relations
- link_artifact(id, kind, ref)       # required; fallback: append link to body
- comment(id, text)                  # required; fallback: append to body
- capture_raw(text) -> handle        # optional; fallback: local .maestro/inbox.md
- search(query) -> [candidate]       # optional; fallback: list_items + local match
- relate(id, kind, target)           # optional; fallback: comment

## Normalized record (anti-corruption layer — every get_item/list_items returns this)
{ id, title, url, type, priority, status (canonical), weight (light|tracked),
  artifacts:[{kind,ref}], subtasks:[{ref,title,state}], links:[{kind,target}],
  created, updated }

## Capability flags (each profile declares them in its header)
{ "supports": ["labels"|"subissues"|"subtasks"|"relations"|...], "scoped_labels": bool, "transports": [...] }

## Transport resolution (preference order)
1. MCP — if the relevant MCP server is connected, use its tools.
2. CLI — else if the tool is on PATH and authenticated, shell out.
3. API — else raw REST/GraphQL with a token from config.backend or env.
Detected once per session. `config.transport` pins a choice and overrides auto-detection.

## Op-required matrix
- 5 always-required core: create_item, get_item, update_item, set_status, list_items
- 2 required for tracked: set_subtasks, set_subtask_state
- 2 required-but-degradable: link_artifact, comment (fall back to body append)
- 3 optional: capture_raw, search, relate (each has a defined fallback)
````

- [ ] **Step 2: Verify all op names and statuses are present**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "$op" assets/maestro/CONTRACT.md || echo "MISSING OP: $op"
done
for st in inbox triaged reviewed planned in-progress in-review done wont-fix deferred duplicate; do
  grep -q "$st" assets/maestro/CONTRACT.md || echo "MISSING STATUS: $st"
done
echo "contract check done"
```
Expected: only `contract check done` (no MISSING lines).

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/CONTRACT.md
git commit -m "feat(p0): add canonical adapter contract reference"
```

---

## Task 2: Files adapter profile

**Files:**
- Create: `assets/maestro/adapters/files.md`
- Test: structural greps (below)

**Interfaces:**
- Consumes: op names, statuses, record shape from `CONTRACT.md` (Task 1).
- Produces: the concrete recipe every refactored skill follows when `config.adapter == "files"`. Defines LD-3 record format, LD-4 id minting, LD-5 status/archival behavior, and the `## Tasks` subtask store.

- [ ] **Step 1: Write the files-adapter profile**

Create `assets/maestro/adapters/files.md`. Include a capability header and one recipe per op. Reproduce LD-3/LD-4/LD-5 verbatim from this plan's Locked Decisions. Key recipes:

````markdown
# Adapter: files (built-in, zero-dependency)

Header: { "supports": ["subtasks","relations","artifacts"], "scoped_labels": false, "transports": ["files"] }

Registry root: `.maestro/items/`. Archived: `.maestro/items/archived/<reason>/`. Prose: `.maestro/work/<id>/`. Inbox: `.maestro/inbox.md`.

## Record format
<reproduce LD-3 exactly, including required-field list and the ## Tasks rule>

## Identity (LD-4)
id = {4-digit-seq}-{slug}. seq = max existing seq across items/ and items/archived/, + 1.
Loose-ref resolution: exact id → unique slug-suffix → ambiguous = error.

## Recipes
- create_item({title,type,priority,body,weight}): mint id (LD-4); write items/<id>.md with required frontmatter, status=inbox unless given, weight defaults light, created=updated=today (`date +%Y-%m-%d`); body sections from LD-3 template; return id.
- get_item(ref): resolve ref (LD-4); read items/<id>.md or items/archived/*/<id>.md; parse frontmatter + ## Tasks + artifacts + links into the normalized record.
- update_item(id,{fields}): rewrite changed frontmatter fields + body; bump updated.
- set_status(id, canonical): set status: field; bump updated; if terminal (LD-5) move file to items/archived/<status>/; if reopening a deferred item, move back to items/ and set the new status.
- list_items({filters}): scan items/ (+ archived/ when a terminal filter is requested); return records matching filters.
- set_subtasks(id, [task]): write/replace the ## Tasks checklist; each task -> `- [ ] <ref> — <title>`.
- set_subtask_state(id, ref, state): flip the matching ## Tasks line: todo=`[ ]`, doing=`[~]`, done=`[x]`.
- link_artifact(id, kind, ref): add {kind,ref} to artifacts: frontmatter (dedupe by kind+ref). (Body-append fallback unused — files supports artifacts natively.)
- comment(id, text): append `> <text>` under ## Notes with a date prefix.
- capture_raw(text): append `- <text>` under the ## Inbox heading of .maestro/inbox.md (create file from template if missing).
- search(query): list_items then match query against id/title/Summary (case-insensitive substring); return candidates.
- relate(id, kind, target): add {kind,target} to links: frontmatter; for duplicate-of also set status=duplicate via set_status.
````

- [ ] **Step 2: Verify recipes cover every op and the record is specified**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "$op" assets/maestro/adapters/files.md || echo "MISSING RECIPE: $op"
done
grep -q '## Record format' assets/maestro/adapters/files.md || echo "MISSING record format"
grep -q '{4-digit-seq}-{slug}' assets/maestro/adapters/files.md || echo "MISSING id rule"
echo "files-adapter check done"
```
Expected: only `files-adapter check done`.

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/adapters/files.md
git commit -m "feat(p0): add files adapter profile (12-op recipes)"
```

---

## Task 3: Config template + `.maestro/` skeleton conventions

**Files:**
- Create: `assets/maestro/config.template.json`
- Test: `python3 -m json.tool`

**Interfaces:**
- Consumes: config keys named in spec §5.4.
- Produces: the default config every new project gets; the `setup` skill (Task 4) copies it. Documents which dirs setup must create.

- [ ] **Step 1: Write the config template**

Create `assets/maestro/config.template.json`:
```json
{
  "adapter": "files",
  "backend": {},
  "statusMap": {},
  "fieldMap": {},
  "captureMode": "local",
  "artifactsDir": ".maestro/work"
}
```

- [ ] **Step 2: Validate JSON**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
python3 -m json.tool assets/maestro/config.template.json >/dev/null && echo "config ok"
```
Expected: `config ok`.

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/config.template.json
git commit -m "feat(p0): add default config template (files adapter)"
```

---

## Task 4: Refactor `setup` skill → `.maestro/`

**Files:**
- Modify: `skills/setup/SKILL.md`
- Modify: `skills/setup/agents/openai.yaml`

**Interfaces:**
- Consumes: `assets/maestro/{CONTRACT.md,adapters/files.md,config.template.json}` (Tasks 1–3); LD-1/LD-2 layout.
- Produces: a `.maestro/` tree that all other refactored skills read.

Current behavior (from exploration): trigger is `conductor/` absent; creates `conductor/index.md`, `product.md`, `product-guidelines.md`, `tech-stack.md`, `workflow.md`, `tracks.md`, `code_styleguides/`; tracks `setup_state.json` keys `status/project_type/current_section/current_question/completed_sections/started_at/last_updated`.

- [ ] **Step 1: Update frontmatter trigger**

In `skills/setup/SKILL.md`, change the description from naming `conductor/` to `.maestro/`:
- Before: `…or when the conductor/ directory does not exist yet and needs initializing.`
- After: `…or when the .maestro/ directory does not exist yet and needs initializing.`

- [ ] **Step 2: Replace context-file targets and add asset copy**

Rewrite the setup steps so they:
1. Create `.maestro/` and copy package assets: `CONTRACT.md`, `adapters/files.md`, `config.template.json` → `.maestro/config.json` (from LD-2). State that copy is idempotent (overwrite `CONTRACT.md`/`adapters/*`; never overwrite an existing `config.json`).
2. Generate context under `.maestro/context/`: `product.md`, `guidelines.md` (renamed from `product-guidelines.md`), `tech-stack.md`, `workflow.md`, `styleguides/{markdown,bash,json}.md`.
3. Create empty `.maestro/work/`, `.maestro/items/` (+ `items/archived/{done,wont-fix,deferred,duplicate}/` for the files adapter), and `.maestro/inbox.md` from the inbox template.
4. Drop `conductor/index.md` and `conductor/tracks.md` (the registry is now the backend; for files it is `items/`). Replace the index doc with a short `.maestro/context/README.md` if an index is desired, or omit.

Map every old path string:
- `conductor/product.md` → `.maestro/context/product.md`
- `conductor/product-guidelines.md` → `.maestro/context/guidelines.md`
- `conductor/tech-stack.md` → `.maestro/context/tech-stack.md`
- `conductor/workflow.md` → `.maestro/context/workflow.md`
- `conductor/code_styleguides/` → `.maestro/context/styleguides/`
- `conductor/tracks.md` → **removed** (no flat registry)
- `conductor/setup_state.json` → `.maestro/setup_state.json` (keep the resume mechanism; same keys)

- [ ] **Step 3: Update `setup_state.json` section names**

The `completed_sections` array currently is `["product","guidelines","tech_stack","workflow","styleguides"]` — unchanged names, but stored at `.maestro/setup_state.json`. Add a final implicit section: setup is complete only after assets are copied AND all context sections done. Document `status: complete` gate unchanged.

- [ ] **Step 4: Update `openai.yaml`**

In `skills/setup/agents/openai.yaml`, change `short_description`/`default_prompt` text from "conductor" to ".maestro":
- `short_description: "Initialize .maestro project context."`
- `default_prompt: "Use $setup to initialize Maestro .maestro/ context and adapter for this repository."`

- [ ] **Step 5: Verify no legacy paths remain in setup**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn 'conductor/' skills/setup && echo "setup clean of conductor/"
grep -q '.maestro/context/' skills/setup/SKILL.md && echo "setup writes context"
grep -q 'adapters/files.md' skills/setup/SKILL.md && echo "setup copies files adapter"
```
Expected: `setup clean of conductor/`, `setup writes context`, `setup copies files adapter`.

- [ ] **Step 6: Commit**

```bash
git add skills/setup/
git commit -m "feat(p0): setup writes .maestro/ + copies contract and files adapter"
```

---

## Task 5: Refactor `triage`

**Files:**
- Modify: `skills/triage/SKILL.md`
- Modify: `skills/triage/agents/openai.yaml`

**Interfaces:**
- Consumes: `capture_raw` inbox at `.maestro/inbox.md`; `create_item`, `search` (files adapter).
- Produces: items in the backend with `status: triaged` from inbox bullets.

Current: reads `issues/INBOX.md` `## Inbox` bullets → writes `issues/YYYY-MM-DD-slug.md` (frontmatter `status: triaged`, `type`, `priority`, `filed`); dedups against `issues/*.md` + active tracks in `conductor/tracks.md`; bootstraps `issues/archived/{...}/`.

- [ ] **Step 1: Rewrite the read source and birth op**

Replace the read of `issues/INBOX.md` with `.maestro/inbox.md` (`## Inbox` bullets unchanged). For each bullet: call `create_item({title, type, priority, body, weight: light})` then `set_status(id, triaged)`. Per LD-3 the adapter sets `filed`→`created`. Remove all `issues/*.md` filename construction.

- [ ] **Step 2: Rewrite dedup**

Replace "scan `issues/*.md` + `conductor/tracks.md`" with: call `search(<bullet text>)` (files adapter falls back to `list_items` + match); if a candidate is a strong match, ask before creating and offer `relate(new, duplicate-of, existing)` instead.

- [ ] **Step 3: Remove the archive-dir bootstrap**

Delete instructions that create `issues/archived/{tracked,implemented,deferred,wont-fix,duplicate}/`. Archival dirs are the files adapter's concern (created lazily by `set_status` on terminal transition), not triage's.

- [ ] **Step 4: Update frontmatter trigger + openai.yaml**

- SKILL.md description: `Use when .maestro/inbox.md has unprocessed bullets that need to become structured work items.`
- `agents/openai.yaml`: `short_description: "Convert inbox bullets into work items."`; `default_prompt: "Use $triage to convert .maestro/inbox.md bullets into structured work items."`

- [ ] **Step 5: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' skills/triage && echo "triage clean"
grep -q '.maestro/inbox.md' skills/triage/SKILL.md && grep -q 'create_item' skills/triage/SKILL.md && echo "triage uses ops"
```
Expected: `triage clean`, `triage uses ops`.

- [ ] **Step 6: Commit**

```bash
git add skills/triage/
git commit -m "feat(p0): triage reads .maestro/inbox.md and calls create_item"
```

---

## Task 6: Refactor `issue-review`

**Files:**
- Modify: `skills/issue-review/SKILL.md`
- Modify: `skills/issue-review/agents/openai.yaml`

**Interfaces:**
- Consumes: `get_item`, `update_item`, `set_status`, `list_items`.
- Produces: items moved to `status: reviewed` with enriched Technical Context.

Current: takes `<issue-file-path> | all`; batch scans `issues/*.md` for `status: triaged`; fills `### Affected Files/Related Tests/Similar Patterns` + Dependencies + Acceptance Criteria; sets `status: reviewed`.

- [ ] **Step 1: Replace single + batch selection**

- Single: argument becomes a loose ref (id/slug/path); `get_item(ref)`.
- Batch (`all`): `list_items({status: triaged})`.
Remove `issues/*.md` scanning and `conductor/tracks/` git-log lookups (replace the "find related/completed work" agent step with `search(<title>)`).

- [ ] **Step 2: Replace enrichment writes**

Enrichment still writes prose into the item body sections (Affected Files / Related Tests / Similar Patterns / Dependencies / Acceptance Criteria). Express as: build the enriched body, then `update_item(id, { body })`. Finish with `set_status(id, reviewed)`.

- [ ] **Step 3: Frontmatter trigger + openai.yaml**

- description: `Use when a triaged work item needs codebase context or scoping before implementation, or "all" to batch-review triaged items.`
- `argument-hint: "<item-ref> | all"`
- openai.yaml `default_prompt`: `Use $issue-review to add codebase context to this triaged work item.`

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' skills/issue-review && echo "issue-review clean"
grep -q 'set_status' skills/issue-review/SKILL.md && grep -q 'reviewed' skills/issue-review/SKILL.md && echo "ok"
```
Expected: `issue-review clean`, `ok`.

- [ ] **Step 5: Commit**

```bash
git add skills/issue-review/
git commit -m "feat(p0): issue-review uses get_item/update_item/set_status"
```

---

## Task 7: Refactor `new-track`

**Files:**
- Modify: `skills/new-track/SKILL.md`
- Modify: `skills/new-track/agents/openai.yaml`

**Interfaces:**
- Consumes: `create_item`, `link_artifact`, `set_subtasks`, `set_status`; `.maestro/work/<id>/`.
- Produces: a `weight: tracked` item with spec/design/plan prose + a `## Tasks` mirror + `status: planned`.

Current: takes `<feature|bug|chore|refactor> <name>`; verifies `conductor/{product,tech-stack,workflow}.md`; writes `conductor/tracks/{id}/{spec,design,plan}.md` + `metadata.json`; appends row to `conductor/tracks.md`; moves design/plan from `docs/superpowers/{specs,plans}`.

- [ ] **Step 1: Replace context preflight**

Replace `conductor/{product,tech-stack,workflow}.md` checks with `.maestro/context/{product,tech-stack,workflow}.md` (and confirm `.maestro/config.json` exists; if not, route to `/setup`).

- [ ] **Step 2: Replace track creation with create_item + work/ prose**

- Mint the item: `create_item({title, type, priority, body, weight: tracked})` → `id` (adapter mints per LD-4). Remove the `tracks.md` uniqueness check and row append (the backend is the registry).
- Write prose to `.maestro/work/<id>/spec.md`, `design.md`, `plan.md` (replacing `conductor/tracks/{id}/*`). When brainstorming/writing-plans emit to `docs/superpowers/{specs,plans}` (or this repo's `docs/{specs,plans}`), move them under `.maestro/work/<id>/` and delete the external copy — same move logic, new destination.
- Link them: `link_artifact(id, spec, .maestro/work/<id>/spec.md)`, and likewise `design`, `plan`.

- [ ] **Step 3: Replace metadata.json with set_subtasks + set_status**

- Delete `metadata.json` creation entirely. Coarse progress now lives in the item's `## Tasks` via `set_subtasks(id, [{ref, title, state: todo} for each plan task])` (one entry per plan task, `ref` = the plan's phase.task number).
- Set lifecycle: `set_status(id, planned)`.

- [ ] **Step 4: Frontmatter trigger + openai.yaml**

- description: `Use when starting a new tracked feature, bug fix, refactor, or chore. For work that already has a reviewed item, use issue-advance instead.`
- openai.yaml `short_description: "Create a tracked item with spec and plan."`; `default_prompt: "Use $new-track to create a tracked work item with a spec and implementation plan."`

- [ ] **Step 5: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'conductor/' -e 'metadata.json' -e 'tracks.md' skills/new-track && echo "new-track clean"
grep -q 'create_item' skills/new-track/SKILL.md && grep -q 'set_subtasks' skills/new-track/SKILL.md && grep -q '.maestro/work/' skills/new-track/SKILL.md && echo "ok"
```
Expected: `new-track clean`, `ok`.

- [ ] **Step 6: Commit**

```bash
git add skills/new-track/
git commit -m "feat(p0): new-track uses create_item + work/ prose + set_subtasks"
```

---

## Task 8: Refactor `issue-advance` → in-place promotion

**Files:**
- Modify: `skills/issue-advance/SKILL.md`
- Modify: `skills/issue-advance/agents/openai.yaml`

**Interfaces:**
- Consumes: `get_item`, `update_item`, `link_artifact`, `set_subtasks`, `set_status`; `.maestro/work/<id>/`.
- Produces: the SAME item promoted to `weight: tracked`, `status: planned`. **No conversion, no new id, no file move.**

Current: takes `<issue-file-path> | all`; requires `status: reviewed`; creates a track via new-track; writes `advanced-to: <track-id>` + `status: tracked` back onto the issue; moves issue to `issues/archived/tracked/`. This is the duplication being killed.

- [ ] **Step 1: Rewrite the core to promotion**

Replace the whole "create a track, then move/annotate the issue" flow with:
1. `get_item(ref)`; require canonical `status == reviewed` (if `triaged`, suggest `/issue-review` first).
2. Produce spec/design/plan into `.maestro/work/<id>/` (same authoring as new-track Steps 2–3, reusing the existing item id — do NOT mint a new one).
3. `link_artifact(id, spec|design|plan, …)`.
4. `set_subtasks(id, [plan tasks])`.
5. `update_item(id, { weight: tracked })`.
6. `set_status(id, planned)`.
Remove: `advanced-to` field, `status: tracked`, and the move to `issues/archived/tracked/`. Add a body note (`comment(id, "Promoted to tracked from reviewed.")`) for provenance.

- [ ] **Step 2: Batch mode**

`all` → `list_items({status: reviewed})`; promote each.

- [ ] **Step 3: Frontmatter trigger + openai.yaml**

- description: `Use when a reviewed work item is ready to grow a spec and plan (promote to tracked), or "all" to batch-promote. For an item that already has a plan, use implement.`
- `argument-hint: "<item-ref> | all"`
- openai.yaml `short_description: "Promote a reviewed item to tracked."`; `default_prompt: "Use $issue-advance to promote this reviewed work item to a tracked item with a spec and plan."`

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' -e 'advanced-to' skills/issue-advance && echo "issue-advance clean"
grep -q 'weight: tracked' skills/issue-advance/SKILL.md && grep -q 'set_status' skills/issue-advance/SKILL.md && echo "promotes in place"
```
Expected: `issue-advance clean`, `promotes in place`.

- [ ] **Step 5: Commit**

```bash
git add skills/issue-advance/
git commit -m "feat(p0): issue-advance promotes item in place (no conversion)"
```

---

## Task 9: Refactor `implement`

**Files:**
- Modify: `skills/implement/SKILL.md`
- Modify: `skills/implement/agents/openai.yaml`

**Interfaces:**
- Consumes: `get_item`, `set_status`, `set_subtask_state`, `capture_raw`, `list_items`; `.maestro/work/<id>/plan.md`.
- Produces: item advanced through `in-progress → (in-review) → done` with per-task subtask states.

Current (two modes): track mode reads `conductor/tracks.md`/`spec.md`/`plan.md`/`metadata.json`, marks plan checkboxes, updates `metadata.json` status/current_task/counts, archives; Direct Issue Mode reads an `issues/*.md` (`reviewed|triaged`), implements, writes `status: implemented`+`implemented`+`commit`, moves to `issues/archived/implemented/`. Also appends out-of-scope findings to `issues/INBOX.md`.

- [ ] **Step 1: Unify the two modes via weight**

Replace "track mode vs direct issue mode" with one flow keyed on `weight`:
- Resolve: argument is a loose ref; `get_item(ref)`. (No more `issues/`-prefix path test.)
- `set_status(id, in-progress)`.
- If `weight == tracked`: read detailed steps from `.maestro/work/<id>/plan.md`; for each plan task, `set_subtask_state(id, <ref>, doing)` then `set_subtask_state(id, <ref>, done)` as it completes. Keep `plan.md` as source of truth for *steps*; the `## Tasks` mirror is source of truth for *status* (spec §8 granularity rule).
- If `weight == light`: implement directly from the item body (no plan.md required).
- On completion: `set_status(id, in-review)` if a review/UAT gate applies, else `set_status(id, done)`.

- [ ] **Step 2: Replace metadata.json bookkeeping**

Delete all `metadata.json` reads/writes (status, current_task, current_phase, counts). Status = `set_status`; progress = `set_subtask_state`. Delete the archive-on-complete move (terminal `set_status` handles archival per LD-5).

- [ ] **Step 3: Replace context loads + INBOX append**

- `conductor/workflow.md` → `.maestro/context/workflow.md`; `conductor/product.md`/`tech-stack.md` → `.maestro/context/…`; `conductor/code_styleguides/` → `.maestro/context/styleguides/`.
- Out-of-scope findings: replace "append bullet to `issues/INBOX.md`" with `capture_raw("<desc> in <file>:<line> (<severity>). Source: implement of <id>.")`.
- Remove `issues/archived/implemented/` move and the `commit:`/`implemented:` issue-frontmatter writes (record completion via `comment(id, "Implemented in <sha>.")` + terminal status).

- [ ] **Step 4: Track selection**

Replace "read `conductor/tracks.md` and show incomplete tracks" with `list_items({status: in-progress})` ∪ `list_items({status: planned})` when no argument is given.

- [ ] **Step 5: Frontmatter trigger + openai.yaml**

- description: `Use when ready to implement a work item — tracked (has spec+plan) or light (simple enough to fix directly). Takes a work-item ref.`
- `argument-hint: "[item-ref] [--task X.Y] [--phase N]"`
- openai.yaml `short_description: "Implement a work item (tracked plan or light fix)."`; `default_prompt: "Use $implement to execute a tracked item's plan with checkpoints, or fix a light item directly."`

- [ ] **Step 6: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' -e 'metadata.json' skills/implement && echo "implement clean"
grep -q 'set_subtask_state' skills/implement/SKILL.md && grep -q 'capture_raw' skills/implement/SKILL.md && echo "ok"
```
Expected: `implement clean`, `ok`.

- [ ] **Step 7: Commit**

```bash
git add skills/implement/
git commit -m "feat(p0): implement unifies modes on weight; uses set_status/set_subtask_state"
```

---

## Task 10: Refactor `issue-close`

**Files:**
- Modify: `skills/issue-close/SKILL.md`
- Modify: `skills/issue-close/agents/openai.yaml`

**Interfaces:**
- Consumes: `get_item`, `set_status`, `relate`, `comment`.
- Produces: item in a terminal status (`wont-fix|deferred|duplicate`) with a recorded reason.

Current: takes `<issue-file-path> [--reason …]`; verifies status not already terminal; writes `status: <reason>` + `closed: YYYY-MM-DD` + optional `duplicate-of`; appends `## Notes`; moves to `issues/archived/<reason>/`.

- [ ] **Step 1: Rewrite to ops**

1. `get_item(ref)`; reject if status already terminal.
2. `set_status(id, <reason>)` where reason ∈ {wont-fix, deferred, duplicate} (terminal move handled by adapter per LD-5).
3. If duplicate: `relate(id, duplicate-of, <target-ref>)`.
4. `comment(id, "<closing note>")` for the reason text.
Remove `closed:` frontmatter write and the explicit `issues/archived/<reason>/` move (adapter does it).

- [ ] **Step 2: Frontmatter trigger + openai.yaml**

- description: `Use when closing a work item without implementing it — wont-fix, deferred, or duplicate.`
- `argument-hint: "<item-ref> [--reason wont-fix|deferred|duplicate]"`
- openai.yaml `short_description: "Close a work item without implementing."`; `default_prompt: "Use $issue-close to close this work item as wont-fix, deferred, or duplicate."`

- [ ] **Step 3: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' skills/issue-close && echo "issue-close clean"
grep -q 'set_status' skills/issue-close/SKILL.md && grep -q 'relate' skills/issue-close/SKILL.md && echo "ok"
```
Expected: `issue-close clean`, `ok`.

- [ ] **Step 4: Commit**

```bash
git add skills/issue-close/
git commit -m "feat(p0): issue-close uses set_status terminal + relate + comment"
```

---

## Task 11: Refactor `status`

**Files:**
- Modify: `skills/status/SKILL.md`
- Modify: `skills/status/agents/openai.yaml`

**Interfaces:**
- Consumes: `list_items`, `get_item`; `.maestro/context/product.md`.
- Produces: a board view (counts by status/priority/weight) — read-only.

Current: reads `conductor/product.md` (name), parses `conductor/tracks.md` counts, per-track `plan.md`/`metadata.json`/`spec.md`, and `issues/INBOX.md` + `issues/*.md` (status/priority).

- [ ] **Step 1: Replace all reads with list_items**

- Project name/description: `.maestro/context/product.md`.
- One unified board from `list_items({})`: group counts by canonical `status`, by `priority`, and by `weight` (tracked vs light). Replace the separate "tracks" and "issues" tallies with a single status histogram. Inbox count = lines under `## Inbox` in `.maestro/inbox.md`.
- Per-item detail (`status <ref>`): `get_item(ref)` → show status, weight, artifacts, and `## Tasks` progress (done/total) for tracked items (replaces plan.md checkbox counting + metadata.json).

- [ ] **Step 2: Frontmatter + openai.yaml**

- description: `Use when getting oriented at the start of a session, or checking overall progress, active work items, and next actions.`
- openai.yaml `short_description: "Show work items and next actions."`; keep `allow_implicit_invocation: true`.

- [ ] **Step 3: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' -e 'metadata.json' -e 'tracks.md' skills/status && echo "status clean"
grep -q 'list_items' skills/status/SKILL.md && echo "ok"
```
Expected: `status clean`, `ok`.

- [ ] **Step 4: Commit**

```bash
git add skills/status/
git commit -m "feat(p0): status renders one board from list_items"
```

---

## Task 12: Refactor `manage`

**Files:**
- Modify: `skills/manage/SKILL.md`
- Modify: `skills/manage/agents/openai.yaml`

**Interfaces:**
- Consumes: `list_items`, `get_item`, `set_status`, `update_item`.
- Produces: archive/restore/rename/delete/cleanup over work items.

Current: `--archive|--restore|--delete|--rename|--cleanup`; moves `conductor/tracks/{id}/` ⇆ `conductor/tracks/_archive/{id}/`; edits `metadata.json` (`archived`, `archived_at`, `archive_reason`, `status_at_archive`, `previous_ids`, `updated`); moves `tracks.md` rows; staleness = `updated` >7 days.

- [ ] **Step 1: Map operations to ops**

- `--archive` → `set_status(id, done)` (or the appropriate terminal status; archival is the terminal move per LD-5). For "archive without completing," use `set_status(id, deferred)`.
- `--restore` → `set_status(id, <prior active status>)`; for files adapter this moves the file out of `items/archived/`. (Restores to `reviewed` if prior status unknown.)
- `--rename` → `update_item(id, { title })`. (Id is immutable per LD-4; renaming changes title only. If a slug change is requested, note it is not supported — id is stable; record old title via `comment`.)
- `--delete` → confirm, then remove the item record + its `work/<id>/` dir (files adapter); for non-files backends, deletion may be unsupported — `set_status(id, wont-fix)` instead, and say so.
- `--cleanup` → `list_items({})`, find items whose `updated` is >7 days in a non-terminal status, offer to defer/archive each.

- [ ] **Step 2: Remove metadata.json / tracks.md / _archive logic**

Delete all `metadata.json` field manipulation and `tracks.md` row moves and `conductor/tracks/_archive/` paths. Archival state is encoded by canonical status + the adapter's storage (LD-5).

- [ ] **Step 3: Frontmatter + openai.yaml**

- description: `Use when archiving, restoring, renaming, deleting, or cleaning up work items. For closing without implementing use issue-close.`
- openai.yaml `short_description: "Manage work-item lifecycle."`; `default_prompt: "Use $manage to list, archive, restore, rename, delete, or clean up Maestro work items."`

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'conductor/' -e 'metadata.json' -e 'tracks.md' -e '_archive' skills/manage && echo "manage clean"
grep -q 'set_status' skills/manage/SKILL.md && grep -q 'update_item' skills/manage/SKILL.md && echo "ok"
```
Expected: `manage clean`, `ok`.

- [ ] **Step 5: Commit**

```bash
git add skills/manage/
git commit -m "feat(p0): manage maps lifecycle ops to set_status/update_item"
```

---

## Task 13: Refactor `session-wrap-up`

**Files:**
- Modify: `skills/session-wrap-up/SKILL.md`
- Modify: `skills/session-wrap-up/agents/openai.yaml`

**Interfaces:**
- Consumes: `list_items`, `get_item`, `set_status`, `set_subtask_state`, `capture_raw`; `.maestro/context/`.
- Produces: updated work-item state + captured follow-ups + context/CLAUDE.md/AGENTS.md updates (the last unchanged).

Current: finds active track via `conductor/tracks/{id}/metadata.json` `updated`; reviews `spec.md`/`plan.md`; updates plan checkboxes, `tracks.md`, `conductor/index.md`; appends follow-ups to `issues/INBOX.md`; reviews `CLAUDE.md`/`CLAUDE.local.md`/`AGENTS.md`.

- [ ] **Step 1: Replace active-work detection**

Replace "most recently `updated` `[~]` track via metadata.json" with `list_items({status: in-progress})` (and `planned`); pick the one touched this session from conversation history.

- [ ] **Step 2: Replace progress writes**

- Plan-task completion: `set_subtask_state(id, ref, done)` for tasks finished this session (was: plan.md checkbox + tracks.md row).
- Status changes: `set_status` (e.g. → `in-review`/`done`).
- Drop `conductor/index.md` / `tracks.md` updates entirely.

- [ ] **Step 3: Replace follow-up capture + context paths**

- Follow-ups: `capture_raw("<description>")` (was: append to `issues/INBOX.md`).
- Context review reads `.maestro/context/*` instead of `conductor/*`.
- `CLAUDE.md`/`CLAUDE.local.md`/`AGENTS.md` review is unchanged (these are not work-item state).

- [ ] **Step 4: openai.yaml**

`default_prompt` unchanged in intent; ensure no "conductor"/"issues" wording: `Use $session-wrap-up to review session work, update context, capture follow-ups, and prepare commits.`

- [ ] **Step 5: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' -e 'metadata.json' -e 'tracks.md' skills/session-wrap-up && echo "wrap-up clean"
grep -q 'capture_raw' skills/session-wrap-up/SKILL.md && echo "ok"
```
Expected: `wrap-up clean`, `ok`.

- [ ] **Step 6: Commit**

```bash
git add skills/session-wrap-up/
git commit -m "feat(p0): session-wrap-up uses list_items/set_status/capture_raw"
```

---

## Task 14: Refactor `uat-create` + `uat-run`

**Files:**
- Modify: `skills/uat-create/SKILL.md`, `skills/uat-create/agents/openai.yaml`
- Modify: `skills/uat-run/SKILL.md`, `skills/uat-run/agents/openai.yaml`

**Interfaces:**
- Consumes: `list_items`, `get_item`, `capture_raw`; `.maestro/work/<id>/spec.md`.
- Produces: a UAT checklist (a repo artifact) + captured failures.

Current: uat-create reads completed `[x]` tracks from both `conductor/tracks.md` sections + `spec.md` (active and `_archive`); writes `conductor/UAT-YYYY-MM-DD.md`; references `issues/INBOX.md`. uat-run reads `conductor/UAT-*.md`, appends failures to `issues/INBOX.md`.

- [ ] **Step 1: uat-create source + output**

- Completed items: `list_items({status: done})` (replaces parsing tracks.md two sections). Acceptance criteria: `get_item(id)` + `.maestro/work/<id>/spec.md`.
- Output file: `.maestro/work/uat/UAT-YYYY-MM-DD.md` (UAT checklists are prose artifacts → live under `work/`, not in the tracker). Replace `conductor/UAT-*.md`.
- Coverage check: scan `.maestro/work/uat/UAT-*.md` for already-covered ids.
- Failure routing text: "failures go to `.maestro/inbox.md` via capture" (the skill itself uses `capture_raw` in uat-run).

- [ ] **Step 2: uat-run source + capture**

- Read newest `.maestro/work/uat/UAT-*.md` (or the given path/date).
- Failures: `capture_raw("<failure with test ref> (type: <inferred>, priority: <inferred>)")` (replaces `issues/INBOX.md` append). Remove `issues/archived/...` bootstrap.

- [ ] **Step 3: openai.yaml (both)**

- uat-create `default_prompt`: `Use $uat-create to generate a UAT checklist from completed Maestro work items.`
- uat-run `default_prompt`: `Use $uat-run to walk through this UAT checklist and capture failures.`

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' -e 'conductor/' skills/uat-create skills/uat-run && echo "uat clean"
grep -q 'list_items' skills/uat-create/SKILL.md && grep -q 'capture_raw' skills/uat-run/SKILL.md && echo "ok"
```
Expected: `uat clean`, `ok`.

- [ ] **Step 5: Commit**

```bash
git add skills/uat-create/ skills/uat-run/
git commit -m "feat(p0): uat skills use list_items + capture_raw, write to work/uat/"
```

---

## Task 15: Refactor `codebase-review`

**Files:**
- Modify: `skills/codebase-review/SKILL.md`
- Modify: `skills/codebase-review/agents/openai.yaml`

**Interfaces:**
- Consumes: `capture_raw`.
- Produces: confirmed findings captured for later triage.

Current: appends confirmed findings to `issues/INBOX.md` (`- **<desc>.** <details>. <severity> priority. Source: codebase-review_YYYYMMDD.`); bootstraps `issues/` if missing. `disable-model-invocation: true` (keep).

- [ ] **Step 1: Replace the INBOX append**

Replace the Phase-4 "append to `issues/INBOX.md`" (and the bootstrap-if-missing block) with: for each confirmed finding, `capture_raw("**<desc>.** <details>. <severity> priority. Source: codebase-review_YYYYMMDD.")`. The adapter creates `.maestro/inbox.md` if missing.

- [ ] **Step 2: openai.yaml**

`default_prompt: "Use $codebase-review to review this repository and capture confirmed findings for triage."` Keep `allow_implicit_invocation: false` and `disable-model-invocation: true`.

- [ ] **Step 3: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'issues/' skills/codebase-review && echo "codebase-review clean"
grep -q 'capture_raw' skills/codebase-review/SKILL.md && echo "ok"
```
Expected: `codebase-review clean`, `ok`.

- [ ] **Step 4: Commit**

```bash
git add skills/codebase-review/
git commit -m "feat(p0): codebase-review captures findings via capture_raw"
```

---

## Task 16: Refactor `workflow-router`

**Files:**
- Modify: `skills/workflow-router/SKILL.md`
- Modify: `skills/workflow-router/agents/openai.yaml`

**Interfaces:**
- Consumes: `.maestro/config.json` (existence + `adapter` + capability flags of the active adapter).
- Produces: routing decisions — read-only.

Current: existence-tests `conductor/` (track system available) and `issues/` (issue pipeline available); detects Superpowers via settings + skills dirs; keeps `allow_implicit_invocation: true`.

- [ ] **Step 1: Replace existence checks**

Replace the two separate checks (`conductor/` → tracks; `issues/` → issues) with one: test `.maestro/config.json`.
- If absent → suggest `/setup`.
- If present → read `adapter` + load capability flags from the active adapter profile; the unified work-item pipeline is available (no more "tracks vs issues available" split — it is one system now).
Keep the Superpowers + Plan Mode + hooks detection unchanged.

- [ ] **Step 2: Update routing copy**

Wherever the routing guidance distinguished "track workflow" from "issue workflow," reframe as light vs tracked weight of one pipeline (triage → review → [advance] → implement). Adjust any decision text that referenced the old two-system split.

- [ ] **Step 3: openai.yaml**

Unchanged keys; ensure description text says "work items" not "tracks/issues."

- [ ] **Step 4: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
! grep -rn -e 'conductor/' skills/workflow-router && echo "router clean of conductor/"
grep -q '.maestro/config.json' skills/workflow-router/SKILL.md && echo "ok"
```
Expected: `router clean of conductor/`, `ok`. (Note: `issues/` may legitimately appear in prose like "issue pipeline"; the grep targets `conductor/` path and config presence. If a literal `issues/` *path* check remains, remove it.)

- [ ] **Step 5: Commit**

```bash
git add skills/workflow-router/
git commit -m "feat(p0): workflow-router checks .maestro/config.json + capabilities"
```

---

## Task 17: Consistency gate

**Files:**
- Test only (no new source). Optionally create: `assets/maestro/` is complete; this task is the P0 acceptance check.

**Interfaces:**
- Consumes: every artifact from Tasks 1–16.
- Produces: proof that P0 is internally consistent — the duplication kill is real and no skill (except installer/hooks, deferred to P1) references legacy stores.

- [ ] **Step 1: No legacy paths in skills**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
echo "=== conductor/ in skills (expect none) ==="
grep -rn 'conductor/' skills/ || echo "CLEAN: no conductor/ in skills"
echo "=== issues/ PATHS in skills (expect none; prose 'issue' is fine) ==="
grep -rn 'issues/' skills/ || echo "CLEAN: no issues/ in skills"
echo "=== metadata.json / tracks.md refs (expect none) ==="
grep -rn -e 'metadata.json' -e 'tracks.md' skills/ || echo "CLEAN: no legacy registry refs"
```
Expected: three CLEAN lines. (`agents-md-sync` is unaffected and should also be clean — it never referenced these.)

- [ ] **Step 2: Every lifecycle skill cites the contract vocabulary**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for s in triage issue-review issue-advance new-track implement issue-close status manage session-wrap-up uat-create uat-run codebase-review workflow-router; do
  grep -Eq 'create_item|get_item|update_item|set_status|list_items|set_subtasks|set_subtask_state|link_artifact|comment|capture_raw|search|relate' skills/$s/SKILL.md \
    || echo "NO OPS: $s"
done
echo "ops-citation check done"
```
Expected: only `ops-citation check done`.

- [ ] **Step 3: Assets present + valid**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
test -f assets/maestro/CONTRACT.md && test -f assets/maestro/adapters/files.md && echo "assets present"
python3 -m json.tool assets/maestro/config.template.json >/dev/null && echo "config valid"
```
Expected: `assets present`, `config valid`.

- [ ] **Step 4: openai.yaml parity (no legacy wording)**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -rln -e 'conductor' -e 'tracks' skills/*/agents/openai.yaml || echo "openai.yaml clean of legacy wording"
```
Expected: `openai.yaml clean of legacy wording` (or a list to fix — re-edit any flagged file's wording and re-run).

- [ ] **Step 5: Repo validation block still passes**

Run (from `AGENTS.md`):
```bash
cd /Users/popeoliv/Developer/skills/maestro
bash -n bin/setup-project
python3 -m json.tool .claude-plugin/plugin.json >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
echo "repo validation ok"
```
Expected: `repo validation ok`.

- [ ] **Step 6: Commit the gate result**

If any check failed, fix in the relevant task's skill and re-run. When all green:
```bash
git commit --allow-empty -m "test(p0): consistency gate green — duplication killed on files backend"
```

---

## Self-Review (run against the spec after writing P0 artifacts)

- **Spec coverage:** §2 reframe → Tasks 7/8 (weight; promotion in place). §3 status machine → CONTRACT.md (Task 1) + every `set_status` call. §4 contract/record/capabilities/transport → Task 1; files recipes → Task 2. §5 `.maestro/` layout/identity/capture → LD-1/LD-3/LD-4 + Task 4 + files adapter `capture_raw`. §6 P0 row ("refactor all skills…files adapter…`.maestro/`") → Tasks 4–16. §7 per-skill table → Tasks 4–16 one-to-one. **Gap check:** spec §5.3 `captureMode: backend` escape hatch — config key exists (Task 3) but files adapter only implements `local`; acceptable for P0 (backend capture is meaningful only once a real tracker exists in P2). Note it in P2.
- **Placeholder scan:** none — every step has concrete paths, op names, and a runnable verification.
- **Type consistency:** op names and the 10 statuses are spelled identically across Tasks 1–17 (closed sets in Global Constraints). Item-record fields match LD-3 everywhere.

## Execution Handoff

Plan complete; will be saved alongside P1–P4 before offering execution. **Recommended execution: Subagent-Driven** (`superpowers:subagent-driven-development`) — one fresh subagent per task with review between tasks; the skill-refactor tasks (5–16) are uniform and independently reviewable, ideal for that loop. The per-skill verification greps are the reviewer's gate.
