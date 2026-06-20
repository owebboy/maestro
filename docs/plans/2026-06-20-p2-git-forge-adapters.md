# P2 — Git-Forge Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three git-forge adapter profiles — `gitea`, `github`, `gitlab` — that implement the 12-op contract against real issue trackers via the MCP > CLI > API transport ladder, and extend `/setup` to select a backend, capture connection config, and bootstrap labels. After P2, Maestro drives a real tracker as its work-item store, the common case.

**Architecture:** Each adapter is one Markdown profile under `assets/maestro/adapters/<name>.md`, following a shared section shape. A profile declares capability flags + supported transports, a transport-detection recipe (MCP→CLI→API), the canonical-status→native mapping (labels + open/closed; GitLab uses scoped labels), the field mapping (type/priority), per-op recipes rendered for each transport, and an idempotent label-bootstrap recipe. Skills are unchanged from P0 — they still call abstract ops; the active profile (named in `.maestro/config.json`) is what differs. `/setup` (a skill) gains a backend branch that writes `config.backend` and runs the bootstrap.

**Tech Stack:** Markdown (adapter profiles, skill bodies), JSON (config), plus the live transports: Gitea MCP (`mcp__gitea__*`, connected in this environment) / `tea` CLI / Gitea REST; GitHub `gh` CLI / REST; GitLab `glab` CLI / REST. No new package code.

---

## Global Constraints

- **Depends on P0** (contract + files adapter + skills speaking abstract ops) and is **independent of P1** (can be built in parallel; both depend only on P0). Cite P0 **Locked Decisions** — especially **LD-6** (transport resolution is adapter-internal; skills never pick a transport) and the canonical status set.
- **Adding a backend = adding one profile + zero skill edits.** If any task here requires editing a lifecycle skill body, that is a design smell — stop and route the need into the adapter profile or the contract. (`/setup` is the sole exception — it is the connection/bootstrap entry point, not a lifecycle op.)
- **Canonical-status mapping must match spec §3.2** exactly (the table below is the single source). Forge mapping: open + `status:<x>` label for active states; **closed** + reason label for terminal states (`done`, `wont-fix`, `deferred`, `duplicate`). GitLab uses scoped labels `status::<x>` (natively mutually exclusive); GitHub/Gitea use plain `status:<x>` and the adapter removes sibling `status:*` labels on each transition.
- **Transport order is fixed: MCP > CLI > API** (spec §4.4). Detection runs once per session. `config.transport` pins a choice. The MCP-availability check is **agent tool introspection** (is `mcp__<backend>__*` in my available tools?), not a shell command; CLI/API checks are shell (`command -v`, auth-status).
- **Label bootstrap must be idempotent** (spec §8): list existing labels first; create only the missing ones; never error on re-run.
- **No live network in required verification.** Structural greps are the required gates. A live Gitea-MCP smoke test is provided as an **optional** acceptance task (Task 8) since this environment has the Gitea MCP.
- **Cross-harness alignment** (`AGENTS.md`): new adapter assets are copied by `bin/setup-project`'s `ensure_maestro_scaffold` (built in P1) which copies the whole `assets/maestro/adapters/` dir — confirm it picks up the new files; update `README.md` + `codex/INSTALL.md` adapter list.
- **Commits YubiKey-signed; submodule git writes need sandbox disabled.**

### Canonical status → git-forge representation (single source; from spec §3.2)

| Canonical | GitHub / Gitea (plain labels) | GitLab (scoped labels) | open/closed |
|---|---|---|---|
| `inbox` | `status:inbox` | `status::inbox` | open |
| `triaged` | `status:triaged` | `status::triaged` | open |
| `reviewed` | `status:reviewed` | `status::reviewed` | open |
| `planned` | `status:planned` | `status::planned` | open |
| `in-progress` | `status:in-progress` | `status::in-progress` | open |
| `in-review` | `status:in-review` | `status::in-review` | open |
| `done` | `done` | `done` | **closed** |
| `wont-fix` | `wont-fix` | `wont-fix` | **closed** |
| `deferred` | `deferred` | `deferred` | **closed (reopen to restore)** |
| `duplicate` | `duplicate` | `duplicate` | **closed** |

Field mapping: `type:<bug|feature|refactor|chore>`, `priority:<P1|P2|P3>`, `weight` → presence of a plan/sub-tasks or a `maestro:tracked` label.

---

## File Structure

**New package assets:**
- `assets/maestro/adapters/_shape.md` — the required-sections contract for any forge profile + the shared transport-detection recipe.
- `assets/maestro/adapters/gitea.md`
- `assets/maestro/adapters/github.md`
- `assets/maestro/adapters/gitlab.md`

**Modified:**
- `skills/setup/SKILL.md` + `skills/setup/agents/openai.yaml` — backend selection, connection capture, bootstrap invocation.
- `skills/triage/SKILL.md` — honor `captureMode: backend` (read `list_items({status: inbox})` in addition to `.maestro/inbox.md`). (This is a capture-mode branch, not a per-backend edit — allowed.)
- `assets/maestro/config.template.json` is unchanged structurally (P0 already has `backend`,`statusMap`,`fieldMap`,`captureMode`,`transport` is added here as an optional key); document new keys.
- `README.md`, `codex/INSTALL.md` — adapter list + backend setup.

**Unchanged:** all lifecycle skill bodies (the whole point).

---

## Task 1: Adapter profile shape + shared transport-detection recipe

**Files:**
- Create: `assets/maestro/adapters/_shape.md`

**Interfaces:**
- Produces: the canonical list of sections every forge profile MUST contain (used by the Task 5 consistency check), and the shared transport-detection algorithm all three reference.

- [ ] **Step 1: Write the shape doc**

Create `assets/maestro/adapters/_shape.md`:
````markdown
# Adapter profile shape (forge adapters)

Every forge adapter profile MUST contain these sections, in order:

1. `## Capabilities` — header object: { "supports":[...], "scoped_labels":bool, "transports":["mcp","cli","api"] }
2. `## Transport detection` — references the shared recipe below; lists this backend's MCP tool prefix, CLI binary, and REST base.
3. `## Status mapping` — the canonical→native table (must match CONTRACT + the P2 plan table).
4. `## Field mapping` — type/priority/weight → labels or native fields.
5. `## Operations` — one subsection per op (all 12), each showing the MCP, CLI, and API rendering.
6. `## Label bootstrap` — idempotent creation of status:*/type:*/priority:* (and maestro:tracked).

## Shared transport-detection recipe (MCP > CLI > API)

Run once per session, before the first op:
1. If `config.transport` is set, use it (skip detection).
2. **MCP:** if my available tools include `mcp__<prefix>__*` for this backend, select `mcp`.
3. **CLI:** else if `command -v <cli>` succeeds AND the CLI reports an authenticated session
   (gitea: `tea login list` non-empty; github: `gh auth status`; gitlab: `glab auth status`), select `cli`.
4. **API:** else if a token is available (`config.backend.token` or the backend's env var), select `api`.
5. **None:** if nothing resolves, STOP and tell the user exactly which of MCP/CLI/API to set up,
   with the one-line command to authenticate each. Never silently fall back to the files adapter.

Resolved transport is reused for the whole session.
````

- [ ] **Step 2: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for s in '## Capabilities' '## Transport detection' '## Status mapping' '## Field mapping' '## Operations' '## Label bootstrap' 'MCP > CLI > API'; do
  grep -q "$s" assets/maestro/adapters/_shape.md || echo "MISSING: $s"
done
echo "shape check done"
```
Expected: only `shape check done`.

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/adapters/_shape.md
git commit -m "feat(p2): adapter profile shape + shared transport-detection recipe"
```

---

## Task 2: Gitea adapter profile

**Files:**
- Create: `assets/maestro/adapters/gitea.md`

**Interfaces:**
- Consumes: `_shape.md` (Task 1), CONTRACT ops, the status table.
- Produces: a complete gitea profile. MCP prefix `mcp__gitea__`; CLI `tea`; REST base `<url>/api/v1/repos/<owner>/<repo>`.

- [ ] **Step 1: Write the profile**

Create `assets/maestro/adapters/gitea.md` following `_shape.md`. Fill in real renderings:

````markdown
# Adapter: gitea

## Capabilities
{ "supports": ["labels","relations","subtasks-as-tasklist"], "scoped_labels": false, "transports": ["mcp","cli","api"] }

## Transport detection
Per _shape.md. MCP prefix: `mcp__gitea__`. CLI: `tea` (auth: `tea login list`). REST base: `<config.backend.url>/api/v1/repos/<owner>/<repo>` (token: config.backend.token or $GITEA_TOKEN).

## Status mapping
<reproduce the P2 plain-label table; terminal = close issue + reason label; non-terminal = open + status:<x>; remove sibling status:* labels on each transition>

## Field mapping
type:<x>, priority:<x> labels; weight tracked = label `maestro:tracked` AND/OR a task-list present.

## Operations
### create_item({title,type,priority,body,weight})
- MCP: mcp__gitea__issue_write (action=create) with title/body; then label_write to add type:/priority:/status:inbox (+ maestro:tracked if weight=tracked). Return the issue number.
- CLI: `tea issues create --title "<t>" --body "<b>" --labels type:<x>,priority:<x>,status:inbox`
- API: POST /issues {title,body,labels:[...]}
### get_item(ref)
- MCP: mcp__gitea__issue_read (number=ref) → map fields to the normalized record; derive canonical status from the status:* label; weight from maestro:tracked/task-list; artifacts/links from body markers.
- CLI: `tea issues <ref> --output json`
- API: GET /issues/<ref>
### update_item(id,{fields}) — edit title/body via issue_write(edit); type/priority via label add/remove.
### set_status(id, canonical)
- Map via Status mapping. Remove all existing status:* labels, add the new one (label_write). If canonical is terminal: also close the issue (issue_write state=closed) and add the reason label. If reopening (deferred→active): reopen + set status:<x>.
- MCP: mcp__gitea__issue_write + label_write. CLI: `tea issues edit <id> --state closed` + label flags. API: PATCH /issues/<id> {state, labels}.
### list_items({status?,type?,priority?,weight?})
- MCP: mcp__gitea__list_issues / search_issues with label filters; map each to a record. CLI: `tea issues list --labels ... --output json`. API: GET /issues?labels=...&state=all.
### set_subtasks(id, [task]) — write a markdown task-list block in the issue body (`- [ ] <ref> — <title>`), under a `## Tasks` heading; supports=subtasks-as-tasklist.
### set_subtask_state(id, ref, state) — edit the body task-list line: todo `[ ]`, doing `[~]`, done `[x]`.
### link_artifact(id, kind, ref) — append `- <kind>: <ref>` under an `## Artifacts` body section (forge has no native artifact field).
### comment(id, text) — MCP/CLI/API native issue comment.
### capture_raw(text) — if config.captureMode==backend: create a draft issue with status:inbox (create_item path, title=first line). Else append to local .maestro/inbox.md.
### search(query) — mcp__gitea__search_issues / `tea issues list --keyword` / GET /issues?q=.
### relate(id, kind, target) — add a comment "duplicate-of #<target>" and for duplicate also set_status duplicate; (Gitea dependencies optional via issue_write if supported).

## Label bootstrap
List labels (mcp__gitea__label_read / `tea labels list` / GET /labels). For each required label not present, create it (label_write / `tea labels create` / POST /labels): status:{inbox,triaged,reviewed,planned,in-progress,in-review}, done, wont-fix, deferred, duplicate, type:{bug,feature,refactor,chore}, priority:{P1,P2,P3}, maestro:tracked. Idempotent: skip existing.
````

- [ ] **Step 2: Verify structure + all ops**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "### $op" assets/maestro/adapters/gitea.md || echo "MISSING OP: $op"
done
grep -q 'mcp__gitea__' assets/maestro/adapters/gitea.md && grep -q 'tea ' assets/maestro/adapters/gitea.md && grep -q '/api/v1/' assets/maestro/adapters/gitea.md && echo "three transports present"
grep -q '## Label bootstrap' assets/maestro/adapters/gitea.md && echo "bootstrap present"
echo "gitea check done"
```
Expected: `three transports present`, `bootstrap present`, `gitea check done`, no MISSING lines.

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/adapters/gitea.md
git commit -m "feat(p2): gitea adapter profile (MCP/CLI/API)"
```

---

## Task 3: GitHub adapter profile

**Files:**
- Create: `assets/maestro/adapters/github.md`

**Interfaces:**
- Produces: github profile. MCP prefix `mcp__github__` (if a GitHub MCP is connected); CLI `gh`; REST base `https://api.github.com/repos/<owner>/<repo>`.

- [ ] **Step 1: Write the profile**

Mirror the gitea structure with GitHub renderings. Key per-op CLI forms:
- create_item: `gh issue create --title "<t>" --body "<b>" --label type:<x> --label priority:<x> --label status:inbox` → returns issue URL/number.
- get_item: `gh issue view <ref> --json number,title,body,labels,state,url`.
- set_status: `gh issue edit <id> --remove-label status:<old> --add-label status:<new>`; terminal → `gh issue close <id> --reason completed|not_planned` + reason label; reopen → `gh issue reopen <id>`.
- list_items: `gh issue list --label status:<x> --state all --json ...`.
- set_subtasks/set_subtask_state: task-list in body (GitHub renders `- [ ]` as a progress bar); OR native sub-issues if `supports` includes `subissues` and the GitHub sub-issues API/`gh` is available — declare `subissues` only if confirmed, else `subtasks-as-tasklist`.
- comment: `gh issue comment <id> --body "<t>"`.
- relate: `gh issue comment` "Duplicate of #<target>" + set_status duplicate; close `--reason not_planned`.
- search: `gh issue list --search "<query>"`.
- Label bootstrap: `gh label list` then `gh label create "<name>" --color <hex>` for missing.
Capabilities header: `{ "supports": ["labels","relations","subtasks-as-tasklist"], "scoped_labels": false, "transports": ["mcp","cli","api"] }`.

- [ ] **Step 2: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "### $op" assets/maestro/adapters/github.md || echo "MISSING OP: $op"
done
grep -q 'gh issue' assets/maestro/adapters/github.md && grep -q 'api.github.com' assets/maestro/adapters/github.md && grep -q '## Label bootstrap' assets/maestro/adapters/github.md && echo "github check done"
```
Expected: `github check done`, no MISSING lines.

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/adapters/github.md
git commit -m "feat(p2): github adapter profile (gh CLI/API)"
```

---

## Task 4: GitLab adapter profile (scoped labels)

**Files:**
- Create: `assets/maestro/adapters/gitlab.md`

**Interfaces:**
- Produces: gitlab profile using **scoped labels** (`status::<x>`), natively mutually-exclusive — so `set_status` does NOT need to manually remove siblings.

- [ ] **Step 1: Write the profile**

Mirror the shape with GitLab renderings. Capabilities: `{ "supports": ["labels","relations","subtasks-as-tasklist"], "scoped_labels": true, "transports": ["mcp","cli","api"] }`.
- Status mapping uses `status::<x>` (double-colon). `set_status`: because scoped labels are mutually exclusive, just add `status::<new>` (GitLab removes the old `status::*` automatically). Terminal → `glab issue close <id>` + reason label.
- create_item: `glab issue create --title "<t>" --description "<b>" --label "type::<x>,priority::<x>,status::inbox"` (use scoped for type/priority too: `type::bug`, `priority::P1`).
- get_item: `glab issue view <ref> -F json` (or `--output json`); map `status::*` scoped label → canonical.
- list_items: `glab issue list --label "status::<x>" --output json`.
- set_subtasks/state: task-list in description (GitLab renders task lists); or child items if available.
- comment: `glab issue note create <id> -m "<t>"`.
- relate: `glab issue note` "Duplicate of #<target>"; set_status duplicate; close.
- search: `glab issue list --search "<query>"`.
- Label bootstrap: `glab label list` then `glab label create --name "status::<x>" --color <hex>` for missing scoped labels.
- API base: `<url>/api/v4/projects/<id>/issues`; scoped labels via the `labels` param.

> **Note the field-mapping divergence:** GitLab uses scoped `type::`/`priority::`/`status::`; GitHub/Gitea use plain `type:`/`priority:`/`status:`. The `scoped_labels` flag drives which the adapter emits — document this explicitly in the Field mapping section.

- [ ] **Step 2: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for op in create_item get_item update_item set_status list_items set_subtasks set_subtask_state link_artifact comment capture_raw search relate; do
  grep -q "### $op" assets/maestro/adapters/gitlab.md || echo "MISSING OP: $op"
done
grep -q 'glab issue' assets/maestro/adapters/gitlab.md && grep -q 'status::' assets/maestro/adapters/gitlab.md && grep -q '"scoped_labels": true' assets/maestro/adapters/gitlab.md && echo "gitlab check done"
```
Expected: `gitlab check done`, no MISSING lines.

- [ ] **Step 3: Commit**

```bash
git add assets/maestro/adapters/gitlab.md
git commit -m "feat(p2): gitlab adapter profile (scoped labels, glab CLI/API)"
```

---

## Task 5: Mapping + bootstrap consistency cross-check

**Files:**
- Test only (consistency assertions across the three profiles).

**Interfaces:**
- Consumes: gitea/github/gitlab profiles.
- Produces: proof the three are shape-complete and their status/field mappings agree with the contract.

- [ ] **Step 1: Shape completeness across all three**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for a in gitea github gitlab; do
  f="assets/maestro/adapters/$a.md"
  for s in '## Capabilities' '## Transport detection' '## Status mapping' '## Field mapping' '## Operations' '## Label bootstrap'; do
    grep -q "$s" "$f" || echo "$a MISSING: $s"
  done
done
echo "shape completeness done"
```
Expected: only `shape completeness done`.

- [ ] **Step 2: Every canonical status appears in every forge mapping**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for a in gitea github gitlab; do
  f="assets/maestro/adapters/$a.md"
  for st in inbox triaged reviewed planned in-progress in-review done wont-fix deferred duplicate; do
    grep -q "$st" "$f" || echo "$a MISSING STATUS: $st"
  done
done
echo "status coverage done"
```
Expected: only `status coverage done`.

- [ ] **Step 3: Bootstrap label sets match**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
for a in gitea github gitlab; do
  f="assets/maestro/adapters/$a.md"
  for lbl in type: priority: maestro:tracked; do
    grep -q "$lbl" "$f" || echo "$a MISSING LABEL FAMILY: $lbl"
  done
done
echo "bootstrap consistency done"
```
Expected: only `bootstrap consistency done`. (GitLab uses `type::`/`priority::`; the substring `type:`/`priority:` still matches, which is fine for presence.)

- [ ] **Step 4: Commit the gate**

```bash
git commit --allow-empty -m "test(p2): forge adapters shape/status/bootstrap consistency green"
```

---

## Task 6: `/setup` — backend selection + connection + label bootstrap

**Files:**
- Modify: `skills/setup/SKILL.md`
- Modify: `skills/setup/agents/openai.yaml`

**Interfaces:**
- Consumes: the adapter profiles; the transport-detection recipe.
- Produces: a setup flow that, after context, asks for a backend and writes a working `config.json` + (for forges) bootstraps labels.

Current (post-P0): setup creates `.maestro/`, copies CONTRACT + files adapter + config, generates context.

- [ ] **Step 1: Add the backend-selection question**

After context generation, add a step: "Which work-item backend?" with options `files` (default, recommended for solo/local), `gitea`, `github`, `gitlab`. Record the choice as `config.adapter`.

- [ ] **Step 2: Connection capture (forge backends only)**

If a forge is chosen:
- Ask repo identity (`owner/name`) and, for self-hosted gitea/gitlab, the base `url`. Write to `config.backend = { repo, url }`.
- Run transport detection (the `_shape.md` recipe): report which transport resolved (MCP/CLI/API) and, if none, the exact auth command to run. Optionally let the user pin `config.transport`.
- Copy ALL adapter profiles into `.maestro/adapters/` (not just the chosen one) so switching later needs no re-copy. (`bin/setup-project` already copies the whole dir; the skill mirrors that.)

- [ ] **Step 3: Label bootstrap invocation (forge backends only)**

Run the chosen adapter's `## Label bootstrap` recipe over the resolved transport. State it is idempotent (safe to re-run). For `files`, skip (no labels) and create `.maestro/items/` + `items/archived/{done,wont-fix,deferred,duplicate}/` instead.

- [ ] **Step 4: captureMode question**

Ask capture mode: `local` (default — fleeting ideas go to `.maestro/inbox.md`) or `backend` (capture creates a draft `status:inbox` issue). Write `config.captureMode`.

- [ ] **Step 5: openai.yaml + frontmatter**

- description: `…initialize .maestro/ context, choose a work-item backend (files/gitea/github/gitlab), and bootstrap it.`
- openai.yaml `short_description: "Initialize .maestro context + backend."`

- [ ] **Step 6: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -q 'gitea' skills/setup/SKILL.md && grep -q 'github' skills/setup/SKILL.md && grep -q 'gitlab' skills/setup/SKILL.md && echo "backends offered"
grep -q 'config.backend' skills/setup/SKILL.md && grep -q -i 'bootstrap' skills/setup/SKILL.md && echo "connection + bootstrap"
grep -q 'captureMode' skills/setup/SKILL.md && echo "capture mode"
! grep -rn 'conductor/' skills/setup && echo "still clean"
```
Expected: `backends offered`, `connection + bootstrap`, `capture mode`, `still clean`.

- [ ] **Step 7: Commit**

```bash
git add skills/setup/
git commit -m "feat(p2): setup selects backend, captures connection, bootstraps labels"
```

---

## Task 7: `captureMode: backend` + config-key documentation

**Files:**
- Modify: `skills/triage/SKILL.md`
- Modify: `assets/maestro/config.template.json` (comment doc; structure stays valid JSON — keep a `_doc` note out, JSON has no comments, so document in CONTRACT/_shape instead)
- Modify: `assets/maestro/CONTRACT.md` (add a short config-keys appendix)

**Interfaces:**
- Consumes: adapters' `capture_raw` backend branch.
- Produces: triage that works in both capture modes; documented config keys (`adapter`, `backend`, `statusMap`, `fieldMap`, `captureMode`, `transport`, `artifactsDir`).

- [ ] **Step 1: triage honors captureMode**

In `skills/triage/SKILL.md`, add: the birth point reads pending captures from BOTH sources depending on `config.captureMode`:
- `local` (default): read `## Inbox` bullets from `.maestro/inbox.md` (P0 behavior).
- `backend`: ALSO `list_items({status: inbox})` and treat each as a pending capture; promote via `set_status(id, triaged)` + enrich, rather than `create_item`.
Keep dedup via `search`. This is a capture-mode branch (config-driven), not a per-backend edit — no backend names appear in triage.

- [ ] **Step 2: Document config keys in CONTRACT**

Append a `## Config keys` section to `assets/maestro/CONTRACT.md`:
```markdown
## Config keys (.maestro/config.json)
- adapter: files | gitea | github | gitlab | linear-jira
- backend: { repo?, url?, token? }  (forge/native connection)
- statusMap: { <canonical>: <native name> }   (remap escape hatch)
- fieldMap: { priority: {...}, type: {...} }
- captureMode: local | backend
- transport: mcp | cli | api   (optional; pins transport, overrides detection)
- artifactsDir: .maestro/work
```

- [ ] **Step 3: Verify**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -q 'captureMode' skills/triage/SKILL.md && grep -q 'status: inbox' skills/triage/SKILL.md && echo "triage capture modes"
grep -q '## Config keys' assets/maestro/CONTRACT.md && grep -q 'transport: mcp' assets/maestro/CONTRACT.md && echo "config documented"
python3 -m json.tool assets/maestro/config.template.json >/dev/null && echo "config still valid"
! grep -rn -e 'conductor/' -e 'gitea\|github\|gitlab' skills/triage && echo "triage backend-agnostic"
```
Expected: `triage capture modes`, `config documented`, `config still valid`, `triage backend-agnostic`.

- [ ] **Step 4: Commit**

```bash
git add skills/triage/ assets/maestro/CONTRACT.md
git commit -m "feat(p2): captureMode backend support + documented config keys"
```

---

## Task 8: P2 consistency gate + optional live Gitea-MCP smoke test

**Files:**
- Test only. Optionally touches a scratch test repo on the connected Gitea (not this repo).

**Interfaces:**
- Consumes: everything in P2.
- Produces: green structural gate (required) + a real round-trip proof against Gitea via MCP (optional, since the MCP is connected here).

- [ ] **Step 1: Required structural gate**

Run:
```bash
cd /Users/popeoliv/Developer/skills/maestro
test -f assets/maestro/adapters/gitea.md && test -f assets/maestro/adapters/github.md && test -f assets/maestro/adapters/gitlab.md && echo "three adapters present"
# installer copies the whole adapters dir (from P1); confirm it isn't hard-coded to files.md only:
grep -q 'adapters' bin/setup-project && echo "installer copies adapters dir"
# lifecycle skills remain backend-agnostic (no forge names leaked):
! grep -rln -e 'mcp__gitea' -e 'gh issue' -e 'glab issue' skills/triage skills/implement skills/status skills/issue-review skills/issue-advance skills/new-track skills/manage skills/issue-close skills/uat-create skills/uat-run skills/session-wrap-up skills/codebase-review skills/workflow-router && echo "skills stay abstract"
echo "p2 gate done"
```
Expected: `three adapters present`, `installer copies adapters dir`, `skills stay abstract`, `p2 gate done`.

> If `installer copies adapters dir` fails, fix `ensure_maestro_scaffold` in `bin/setup-project` to copy the directory rather than an enumerated file list, then re-run.

- [ ] **Step 2: (Optional) Live Gitea-MCP round trip**

Only if the user wants live confirmation and has a throwaway Gitea repo. Using the connected Gitea MCP, exercise the gitea profile end-to-end on a scratch repo:
1. Label bootstrap → `mcp__gitea__label_read` shows status:*/type:*/priority:* present.
2. `create_item` → `mcp__gitea__issue_write` creates an issue with `status:inbox`,`type:chore`,`priority:P3`.
3. `set_status(reviewed)` → labels show only `status:reviewed` (siblings removed), issue still open.
4. `set_status(done)` → issue closed + `done` label.
5. `list_items({status: done})` → returns the closed issue.
Record the issue number used and delete/close the scratch issue afterward. **Do not run against a real project tracker.**

- [ ] **Step 3: Update docs adapter list**

In `README.md` and `codex/INSTALL.md`, list the available adapters (files, gitea, github, gitlab) and note "choose at `/setup`." Verify:
```bash
cd /Users/popeoliv/Developer/skills/maestro
grep -q 'gitea' README.md && grep -q 'gitlab' README.md && echo "readme lists adapters"
```
Expected: `readme lists adapters`.

- [ ] **Step 4: Commit**

```bash
git add README.md codex/INSTALL.md
git commit -m "docs(p2): list git-forge adapters + backend setup"
git commit --allow-empty -m "test(p2): git-forge adapters gate green"
```

---

## Self-Review (against spec §6.1 P2 row + §3.2 + §4.4)

- **Spec coverage:** "gitea + github + gitlab (one shared profile shape)" → Tasks 1–4 (`_shape.md` + three profiles). "`/setup` gains backend pick + connection + label bootstrap" → Task 6. Transport ladder MCP>CLI>API (§4.4) → `_shape.md` recipe, cited by all three. Status mapping incl. GitLab scoped labels (§3.2) → the P2 table + Tasks 2/3/4 (gitlab `scoped_labels: true`). Label-bootstrap idempotency (§8) → each profile's bootstrap section + Task 5/8 checks. captureMode backend escape hatch (§5.3) → Task 7. "Adding a backend = zero skill edits" → Task 8 Step 1 asserts no forge names leak into lifecycle skills.
- **Placeholder scan:** none — every op has concrete MCP tool / CLI command / REST endpoint forms.
- **Type consistency:** the status table is identical across CONTRACT, this plan, and all three profiles; field-mapping divergence (plain vs scoped labels) is explicit and driven by the `scoped_labels` flag; op names match the closed set.
- **Carried to P3:** Linear/Jira reuse this shape (Task 1 `_shape.md`) and the statusMap/fieldMap remap mechanism (documented in Task 7).

## Execution Handoff

**Recommended: Subagent-Driven.** Tasks 2–4 are parallel-friendly (three independent profiles following one shape) — dispatch them concurrently, then run Task 5's cross-check as the merge gate. Task 8's live smoke test is optional and requires the connected Gitea MCP + a throwaway repo; gate on the structural checks for CI.
