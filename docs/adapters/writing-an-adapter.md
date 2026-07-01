# Writing a New Adapter Profile

This guide walks you through authoring a Maestro adapter profile for a backend that is not yet
supported. The worked reference throughout is the Gitea profile
(`assets/maestro/adapters/gitea.md`); refer to it while reading each step.

An adapter profile is a Markdown file. Skills load it at runtime and execute its recipes — the
profile itself contains no runnable code, only human-readable (and agent-readable) instructions.

---

## Step 1: Copy the six-section shape from `_shape.md`

Open `assets/maestro/adapters/_shape.md`. It defines the required sections for every forge
adapter profile:

1. `## Capabilities`
2. `## Transport detection`
3. `## Status mapping`
4. `## Field mapping`
5. `## Operations`
6. `## Label bootstrap`

Create your profile file at `assets/maestro/adapters/<name>.md` and add these six headings.
If your backend uses native workflow states instead of labels (like Linear or Jira), replace
section 6 with `## State setup` — see `assets/maestro/adapters/linear-jira.md` for that
variant.

---

## Step 2: Declare capability flags honestly

Fill in the `## Capabilities` header as a JSON object:

```json
{
  "supports": ["labels", "relations", "subtasks-as-tasklist"],
  "scoped_labels": false,
  "transports": ["mcp", "cli", "api"]
}
```

The `supports` array drives CONTRACT §Degradation fallback selection. Declare only what the
backend actually provides:

- `labels` — the backend has issue labels that the adapter uses for status, type, and priority.
- `subtasks-as-tasklist` — subtasks are stored as a `## Tasks` Markdown checklist in the body.
- `subissues` — the backend has native child/sub-issues (use this for Linear/Jira, not for
  forge adapters).
- `relations` — the backend has typed issue links (Linear/Jira); forge adapters fall back to
  comments.
- `priority-field` — priority is a native first-class field rather than a label.
- `type-field` — issue type is a native first-class field rather than a label.
- `area` — the adapter can set/read a free-form `area` classification (a project-defined,
  open-ended value — not a closed enum like type/priority). Optional; see
  `assets/maestro/adapters/gitea.md` for the reference implementation (plain `area:<value>`
  label, created on demand since there's no fixed set to pre-bootstrap).

`scoped_labels: true` means the backend enforces label mutual-exclusivity natively within a
scope (e.g. GitLab's `status::*`). Set `false` for plain-label backends; the adapter must then
remove sibling `status:*` labels explicitly on each `set_status` call.

**Do not inflate this list.** CONTRACT §Degradation rule 3 says: if a tracked item needs
`set_subtasks` and the backend supports neither `subissues` nor `subtasks-as-tasklist`, the
agent must STOP with a message — it never silently drops progress. Declaring a capability you
have not implemented causes silent failures.

---

## Step 3: Implement the five core ops first

The five always-required ops support the full light-item workflow:

1. `create_item` — create an issue with type, priority, and initial status `inbox`.
2. `get_item` — fetch by ref and return the normalized record (CONTRACT `## Normalized record`).
3. `update_item` — edit title, body, type, or priority.
4. `set_status` — transition to a new canonical status; map to the backend's native representation.
5. `list_items` — filter by status, type, priority, and/or weight.

For each op write three renderings under its `### <op>` subsection: **MCP**, **CLI**, and
**API**. The agent uses whichever transport was resolved at session start.

Gitea reference — `### create_item` shows:
- MCP: `mcp__gitea__issue_write` (action=create) then `mcp__gitea__label_write` to add labels.
- CLI: `tea issues create --title … --labels …`
- API: `POST /api/v1/repos/<owner>/<repo>/issues`

If your backend has no CLI, omit the CLI path and remove `"cli"` from `transports`. If an
official MCP server does not yet exist, omit the MCP path similarly.

---

## Step 4: Add `set_subtasks` and `set_subtask_state`

These ops are required for tracked items (items with `weight: tracked`).

Choose the implementation strategy that matches your `supports` declaration:

**Task-list strategy** (`subtasks-as-tasklist`): write or replace a `## Tasks` section in the
issue body. Each task becomes a Markdown checkbox line:

```
## Tasks
- [ ] 1.1 — Scaffold module
- [~] 1.2 — Wire endpoints
- [x] 1.3 — Add migration
```

State encoding: `[ ]` = todo, `[~]` = doing, `[x]` = done.

`set_subtasks` fetches the current body, replaces (or creates) the `## Tasks` block with a
fresh list, and writes the body back. `set_subtask_state` fetches the body, finds the matching
task line by its leading ref token, toggles the state marker, and writes the body back.

See the Gitea profile's `### set_subtasks` and `### set_subtask_state` sections for a concrete
example of body-fetch → splice → body-write across all three transports.

**Native sub-issue strategy** (`subissues`): create real child issues and update their status.
See `linear-jira.md` `### set_subtasks` for the Linear/Jira renderings.

If neither strategy is viable for your backend, do not declare `subissues` or
`subtasks-as-tasklist` in `supports`. CONTRACT §Degradation rule 3 will surface a clear message
to the user rather than silently dropping task progress.

---

## Step 5: Wire the artifact, comment, and optional ops

Implement the remaining ops, leaning on CONTRACT §Degradation fallbacks where the backend has
no native surface:

**`link_artifact(id, kind, ref)`** — required, but fallback applies. If the backend has no
native artifact field, append `- <kind>: <ref>` under a `## Artifacts` section in the body
(CONTRACT §Degradation rule 1). Gitea uses this fallback; GitHub uses a structured comment
instead; `files` writes to the frontmatter `artifacts:` list natively.

**`comment(id, text)`** — required, but fallback applies. If the backend has no native comments,
append the text under `## Notes` in the body (CONTRACT §Degradation rule 1). Every current
adapter has native comments.

**`capture_raw(text)`** — optional. When `config.captureMode == "backend"`, create a new issue
with `status:inbox` using the `create_item` path; otherwise append a dated bullet to
`.maestro/inbox.md` (CONTRACT §Degradation rule 2). Always document both branches in the recipe.

**`search(query)`** — optional. If the backend has a native search API, call it. Fallback:
`list_items` then case-insensitive substring match on title and body (CONTRACT §Degradation
rule 2). Document both.

**`relate(id, kind, target)`** — optional. If the backend supports typed issue links, call
them. Fallback: post a `comment` with the relation text, e.g. `"blocks #<target>"`. For the
`duplicate` kind, also call `set_status(id, "duplicate")` regardless of which path is taken
(CONTRACT §Degradation rule 2).

---

## Step 6: Write the transport-detection block

Every profile must run transport detection once per session, before the first op. Paste the
shared recipe from `_shape.md` `## Shared transport-detection recipe` and fill in the
backend-specific values:

1. If `config.transport` is set, use it (skip detection).
2. **MCP:** check whether tools named `mcp__<your-prefix>__*` appear in the available tool set.
3. **CLI:** `command -v <binary>` succeeds AND an auth-check command confirms a live session
   (e.g. Gitea: `tea login list` non-empty; GitHub: `gh auth status`).
4. **API:** a token is present (`config.backend.token` or the backend-specific env var).
5. **None:** STOP. Print which of MCP/CLI/API to set up AND the one-line command to authenticate
   each option. Never silently fall back to the `files` adapter.

The "None" branch is mandatory. Silently degrading to `files` when the configured backend is
unavailable violates CONTRACT §Degradation rule 4.

---

## Step 7: Add a label/state bootstrap section

**Forge adapters (`## Label bootstrap`):** document an idempotent procedure that creates all
required labels the first time `/setup` runs. List the required labels with suggested colors.
The procedure must:
- Fetch the existing label list first.
- Create only labels that are absent.
- Never error if a label already exists; skip rather than overwrite user customizations.
- Show all three transport renderings (MCP, CLI, API).

Required label groups for a forge adapter:
- `status:inbox` through `status:in-review` (six labels) — open-state canonical statuses.
- `done`, `wont-fix`, `deferred`, `duplicate` — terminal reason labels.
- `type:bug`, `type:feature`, `type:refactor`, `type:chore`
- `priority:P1`, `priority:P2`, `priority:P3`
- `maestro:tracked` — marks items with plan progress.

Use `status::` (double colon) for scoped-label backends (`scoped_labels: true`).

**Native-tracker adapters (`## State setup`):** document what `/setup` must discover and
persist. This includes enumerating workflow states, presenting the default tier-2 mapping table
to the user for confirmation, writing overrides to `config.statusMap`, and caching state IDs
or transition IDs in `config.backend.stateCache`. See `linear-jira.md` `## State setup` for a
full example.

---

## Step 8: Validate the package

After writing the profile, run the static validator:

```bash
python3 bin/validate-maestro .
```

Expected output: `maestro validation ok` with exit code 0.

The validator checks:
- `CONTRACT.md` names all 12 ops, all 10 canonical statuses, and the `## Degradation` + `## Config keys` sections.
- Each adapter profile under `assets/maestro/adapters/` (except `files`, which uses a simpler shape) contains the required shape sections and mentions all 12 ops.
- The lifecycle skills do not reference any backend tool or name directly (backend-abstraction check; `setup` is excluded because it is the connection entry point).

(JSON-manifest validity is checked separately by the `python3 -m json.tool` lines in the `AGENTS.md` validation block, not by `bin/validate-maestro`.)

Fix any errors it reports before wiring in the new adapter name.

---

## Step 9: Test with the new adapter

1. In a test project's `.maestro/config.json`, set `adapter: <your-new-name>`.
2. Run `/setup` to trigger label bootstrap or state discovery.
3. Run through the light-item workflow: `/triage` → `/item-review` → `/implement` on a small
   item. Confirm each abstract op resolves correctly through your profile.
4. If you declared `subtasks-as-tasklist` or `subissues`, create a tracked item (`/track-new`)
   and verify `set_subtasks` and `set_subtask_state` work.

---

## Quick checklist

- [ ] Profile file at `assets/maestro/adapters/<name>.md`
- [ ] Six sections (or five + `## State setup` for native-tracker backends)
- [ ] `## Capabilities` header — `supports`, `scoped_labels`, `transports` filled in accurately
- [ ] Five core ops (`create_item`, `get_item`, `update_item`, `set_status`, `list_items`) with
      MCP / CLI / API renderings for every transport in `transports`
- [ ] `set_subtasks` and `set_subtask_state` matching the declared subtask strategy
- [ ] `link_artifact`, `comment`, `capture_raw`, `search`, `relate` with fallback notes
- [ ] Transport-detection block with a hard-stop "None" branch
- [ ] Label bootstrap (forge) or state setup (native) section
- [ ] `python3 bin/validate-maestro .` → `maestro validation ok`
- [ ] End-to-end test with `config.adapter: <name>`
