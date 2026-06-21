---
name: setup
description: Use when starting a new project with Maestro, or when the .maestro/ directory does not exist yet and needs initializing. Interactively collects project context, lets you choose a work-item backend (files/gitea/github/gitlab/linear/jira), and bootstraps it.
argument-hint: "[--resume]"
---

# Project Setup

Initialize project context through interactive Q&A. Creates the `.maestro/` directory with foundational documents that inform all other workflow skills, and copies package assets into it.

## Pre-flight

1. Check if `.maestro/` already exists:
   - If `.maestro/context/product.md` exists: ask whether to resume or reinitialize
   - If `.maestro/setup_state.json` exists with incomplete status: offer to resume
2. Detect project type:
   - **Greenfield**: no .git, no package.json/go.mod/requirements.txt/Cargo.toml, no src/
   - **Brownfield**: any of the above exist — analyze existing code to pre-populate answers

## Interactive Q&A

**Rules:** Ask ONE question per turn. Wait for response. Offer 2-3 suggested answers plus "Type your own." Ask no more than 5 questions per section; some sections cap lower, as noted in each section heading. Save progress to `.maestro/setup_state.json` after each step.

### Section 1: Product (max 5 questions)

1. **Project Name** — infer from directory name or package files
2. **Description** — one-sentence summary
3. **Problem Statement** — what problem this solves
4. **Target Users** — who benefits
5. **Key Goals** (optional) — 2-3 goals

### Section 2: Guidelines (max 3 questions)

1. **Voice and Tone** — professional / friendly / concise / other
2. **Design Principles** — simplicity / performance / DX / safety / other

### Section 3: Tech Stack (max 5 questions)

For brownfield: scan for package.json, go.mod, requirements.txt, Cargo.toml first. Present findings and ask for confirmation.

1. **Primary Language(s)**
2. **Frontend Framework** (if applicable)
3. **Backend Framework** (if applicable)
4. **Database** (if applicable)
5. **Infrastructure** — deployment target

### Section 4: Workflow (max 4 questions)

1. **TDD Strictness** — strict (tests before code) / moderate (encouraged) / flexible
2. **Commit Strategy** — conventional commits / descriptive / squash per task
3. **Code Review** — required for all / required for non-trivial / optional
4. **Verification Checkpoints** — after each phase / after each task / at track completion

### Section 5: Style Guides (max 2 questions)

1. **Languages** — which style guides to generate (detect from tech stack)
2. **Existing Configs** — incorporate .eslintrc, .prettierrc, etc.?

## Artifact Generation

After Q&A, perform two steps in order:

### Step A: Copy package assets

Copy package assets from `assets/maestro/` into `.maestro/`. These are idempotent — overwrite `CONTRACT.md` and all files under `adapters/` on every run (they are package-managed); NEVER overwrite `.maestro/config.json` if it already exists (it is project-owned).

| Source (package) | Destination |
|---|---|
| `assets/maestro/CONTRACT.md` | `.maestro/CONTRACT.md` |
| `assets/maestro/adapters/` (whole directory) | `.maestro/adapters/` (all profiles, overwrite each) |
| `assets/maestro/config.template.json` | `.maestro/config.json` (only if not already present) |

Copying all adapter profiles now (not just the chosen one) means switching backends later requires no re-copy.

### Step B: Generate context files

Generate these files populated with Q&A answers:

| File | Purpose |
|------|---------|
| `.maestro/context/product.md` | Product vision, problem, users, goals |
| `.maestro/context/guidelines.md` | Voice, tone, design principles |
| `.maestro/context/tech-stack.md` | Languages, frameworks, infra, dependencies |
| `.maestro/context/workflow.md` | TDD policy, commits, reviews, verification rules |
| `.maestro/context/styleguides/<language>.md` | One file per language selected in Section 5 (e.g. markdown, bash, json) |

Also create the following empty directories and files:

| Path | Notes |
|------|-------|
| `.maestro/work/` | Prose artifacts dir (spec.md, design.md, plan.md per item) |
| `.maestro/inbox.md` | Pre-triage scratch (create from template if not present) |

Note: `.maestro/items/` and its archived sub-directories are created in the Backend Bootstrap step below (files adapter only).

The inbox template (written only if `.maestro/inbox.md` does not already exist):
```
# Inbox

Pre-triage scratch. One bullet per raw item; triage converts these into work items.

## Inbox
```

## Backend Selection and Bootstrap

After Artifact Generation, run the following steps in order. All answers are written to `.maestro/config.json` (which was just created from the template if it did not exist, or already exists as the project-owned copy).

### Step C: Choose a work-item backend

Ask:

> Which work-item backend should Maestro use?
>
> 1. **files** (default — recommended for solo/local work; no external service required)
> 2. **gitea** — self-hosted Gitea instance
> 3. **github** — GitHub.com or GitHub Enterprise
> 4. **gitlab** — GitLab.com or self-hosted GitLab
> 5. **linear** — Linear.app (native states; per-team workflow)
> 6. **jira** — Jira Cloud or Jira Server (native states; per-team workflow)

Record the choice as `config.adapter` in `.maestro/config.json`. For `linear` or `jira`, both resolve to the `linear-jira.md` adapter profile (the profile branches internally on `config.backend.kind`).

### Step D: Connection capture (forge and native-tracker backends)

Skip this step if the user chose `files` — go directly to Step E.

If a forge (`gitea`, `github`, or `gitlab`) was chosen:

1. **Repo identity** — ask for the repository in `owner/name` form (e.g. `acme/myapp`). Write to `config.backend.repo`.

2. **Base URL** (self-hosted only — gitea and gitlab) — ask for the instance URL (e.g. `https://gitea.example.com`). Write to `config.backend.url`. Skip for github (always `https://api.github.com`).

3. **GitLab project ID** (gitlab only) — ask for the project's numeric ID or full path (e.g. `42` or `acme/myapp`); the numeric ID is preferred for the REST API. Write to `config.backend.project_id`. (The `glab` CLI resolves the project from repo context, so this is needed only for the MCP and API transports — capture it regardless so any transport works. The gitlab adapter's REST base is `config.backend.url/api/v4/projects/<project_id>/issues`.)

4. **Transport detection** — run the shared recipe (see below) to determine which transport is available. Report the resolved transport to the user. If none resolves, print the exact auth command for each transport and STOP — do not continue setup and do not fall back to the files adapter.

   Backend-specific detection values:

   | Backend | MCP prefix | CLI binary | CLI auth check | REST base |
   |---|---|---|---|---|
   | `gitea` | `mcp__gitea__` | `tea` | `tea login list` (non-empty) | `config.backend.url/api/v1/repos/<owner>/<repo>` |
   | `github` | `mcp__github__` | `gh` | `gh auth status` | `https://api.github.com/repos/<owner>/<repo>` |
   | `gitlab` | `mcp__gitlab__` | `glab` | `glab auth status` | `config.backend.url/api/v4/projects/<id>/issues` |

   **Transport detection recipe (MCP > CLI > API):**
   1. If `config.transport` is already set, use it (skip detection).
   2. **MCP:** if my available tools include `mcp__<prefix>__*` for this backend → resolved = `mcp`.
   3. **CLI:** else if `command -v <cli>` succeeds AND the CLI reports an authenticated session → resolved = `cli`.
   4. **API:** else if `config.backend.token` or the backend's standard env var is set → resolved = `api`.
   5. **None:** STOP. Tell the user exactly which of MCP / CLI / API to set up, with the one-line auth command for each. Never silently fall back to `files`.

5. **Pin transport (optional)** — offer the user the option to pin the resolved transport by setting `config.transport` in `config.json`. If they decline, leave `config.transport` unset (detection runs each session).

If `linear` was chosen:

1. **Linear MCP check** — check whether `mcp__linear__*` tools are available in this session. If yes, confirm the connection is live (no further credentials needed for MCP transport). If MCP is not available, continue to credential capture below.

2. **Team key** — ask:

   > What is your Linear team key (e.g. `ENG`, `BACKEND`)? This is the short identifier shown in Linear → Settings → Teams.

   Write to `config.backend.team`.

3. **API key** (only if MCP is not available) — ask:

   > Paste your Linear API key (Settings → Security → Personal API keys). Leave blank if you will set `LINEAR_API_KEY` as an environment variable.

   Write to `config.backend.token` if provided (or record that the env var path will be used).

4. **Write backend block** — write to `config.backend`:
   ```json
   { "kind": "linear", "team": "<team key>", "token": "<key if captured>" }
   ```
   Omit `token` if using the env var path.

5. **Transport detection (Linear — MCP or API only; no CLI):**
   1. If `config.transport` is already set, use it (skip detection).
   2. **MCP:** if my available tools include `mcp__linear__*` → resolved = `mcp`.
   3. **API:** else if `config.backend.token` or `$LINEAR_API_KEY` is set → resolved = `api` (Linear GraphQL at `https://api.linear.app/graphql`).
   4. **None:** STOP. Tell the user to either connect the Linear MCP server or supply an API key. Never fall back to `files`. Do NOT attempt CLI detection — Linear has no official CLI.

6. **Pin transport (optional)** — offer to pin via `config.transport`. If declined, leave unset.

If `jira` was chosen:

1. **Jira MCP check** — check whether `mcp__atlassian__*` or `mcp__jira__*` tools are available. If yes, confirm connection is live.

2. **Site URL** — ask:

   > What is your Jira site URL (e.g. `https://yourcompany.atlassian.net` or your self-hosted URL)?

   Write to `config.backend.url`.

3. **Project key** — ask:

   > What is your Jira project key (e.g. `ENG`, `PROJ`)?

   Write to `config.backend.project`.

4. **Credentials** (only if MCP is not available) — ask:

   > Provide your Jira email and API token (Jira → Account Settings → Security → API tokens), separated by a newline, or leave blank if you will use the `jira` CLI (which handles auth separately) or set `JIRA_USER_EMAIL` + `JIRA_API_TOKEN` as environment variables.

   Write `config.backend.email` and `config.backend.token` if provided.

5. **Write backend block** — write to `config.backend`:
   ```json
   { "kind": "jira", "url": "<site url>", "project": "<project key>" }
   ```
   Include `email` and `token` if captured.

6. **Transport detection (Jira — MCP > CLI > API):**
   1. If `config.transport` is already set, use it (skip detection).
   2. **MCP:** if my available tools include `mcp__atlassian__*` or `mcp__jira__*` → resolved = `mcp`.
   3. **CLI:** else if `command -v jira` succeeds AND `jira me` returns a valid user → resolved = `cli`.
   4. **API:** else if `config.backend.token` or `$JIRA_API_TOKEN` is set → resolved = `api` (Jira REST at `<url>/rest/api/3`).
   5. **None:** STOP. Tell the user to set up one of: Jira MCP server, `jira` CLI (ankitpokhrel/jira-cli), or Jira API token (`$JIRA_API_TOKEN`). Never fall back to `files`.

7. **Pin transport (optional)** — offer to pin via `config.transport`. If declined, leave unset.

### Step E: Label bootstrap and state discovery

**For `files` backend:**

Create the following directory structure (idempotent — skip any paths that already exist):

| Path | Notes |
|------|-------|
| `.maestro/items/` | Files-adapter registry root |
| `.maestro/items/archived/done/` | Archived terminal: done |
| `.maestro/items/archived/wont-fix/` | Archived terminal: wont-fix |
| `.maestro/items/archived/deferred/` | Archived terminal: deferred |
| `.maestro/items/archived/duplicate/` | Archived terminal: duplicate |

No label bootstrap is needed for the files adapter.

**For forge backends (`gitea`, `github`, `gitlab`):**

Run the chosen adapter's `## Label bootstrap` procedure from `.maestro/adapters/<adapter>.md`. This is idempotent — it lists existing labels first and creates only those that are missing; it is safe to re-run at any time.

Use the transport resolved in Step D for the bootstrap calls (MCP / CLI / API as determined).

**For native-tracker backends (`linear`, `jira`) — state discovery + statusMap builder:**

Instead of label bootstrap, perform state discovery and build `config.statusMap` and `config.fieldMap`. Use the transport resolved in Step D for all discovery calls.

#### E.1 Discover native workflow states

- **Linear:** call `mcp__linear__list_issue_statuses` (MCP) or query `workflowStates(filter: { team: { key: { eq: "<team>" } } }) { nodes { id name type } }` via the Linear GraphQL API.
- **Jira:** call the Jira MCP list-statuses tool (MCP), or run `jira project list-statuses <project>` (CLI), or GET `<url>/rest/api/3/project/<project>/statuses` (API). Extract the unique status names from all issue types.

Collect the full list of native state names and display them to the user:

> I discovered the following workflow states on your team's board:
> `[list the discovered state names]`

#### E.2 Propose statusMap

Using the default canonical→native state table below, plus fuzzy/synonym matching against the discovered states, propose a mapping for all 10 canonical statuses. Present it as an editable table:

| Canonical status | Proposed native state | Source |
|---|---|---|
| `inbox` | `<proposed>` | default table / fuzzy match / no match |
| `triaged` | `<proposed>` | … |
| `reviewed` | `<proposed>` | … |
| `planned` | `<proposed>` | … |
| `in-progress` | `<proposed>` | … |
| `in-review` | `<proposed>` | … |
| `done` | `<proposed>` | … |
| `wont-fix` | `<proposed>` | … |
| `deferred` | `<proposed>` | … |
| `duplicate` | `<proposed>` | … |

Default canonical→native reference (use this as tier-2 starting point):

| Canonical | Linear default | Jira typical |
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

Fuzzy/synonym rules (must match the adapter profile's tier-3 synonyms exactly): `reviewed` ↔ {Selected, Ready}; `in-progress` ↔ {In Progress, Doing}; `done` ↔ {Done, Closed, Complete}.

Ask:

> Does this statusMap look correct? Reply with any corrections in the form `<canonical>: <native state name>`, or press Enter to accept as-is.

Apply user corrections and persist the final mapping as `config.statusMap` in `config.json`.

#### E.3 Handle unmapped canonical statuses

For any canonical status where no matching native state was found (proposed native = none), flag it:

> The following canonical statuses have no native equivalent on your board: `<list>`.
> For each, choose:
> a) Map to nearest state (I'll suggest one) — skills that set this status will use that state instead
> b) Leave unmapped — skills that would set it will fall back to the adjacent canonical state

For each unmapped status, wait for the user's choice and record it in `config.statusMap` (map-to-nearest: write the chosen native state name; leave-unmapped: write `null` for that key).

#### E.4 fieldMap builder

**Priority discovery:**

- **Linear:** native priorities are fixed (0 = No Priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low).
- **Jira:** call the Jira MCP priorities tool (MCP), or GET `<url>/rest/api/3/priority` (API). Display the discovered priority names.

**Issue type discovery:**

- **Linear:** issue types are not distinct in Linear (all issues are the same type); set `config.fieldMap.type = null`.
- **Jira:** call the Jira MCP issue-types tool (MCP), or `jira issue list-types` (CLI), or GET `<url>/rest/api/3/project/<key>/issuetypes` (Jira Cloud; or `<url>/rest/api/3/issuetype` as the server fallback) (API). Display the discovered types.

Propose `config.fieldMap`:

```json
{
  "priority": {
    "P1": "<native urgent/highest priority>",
    "P2": "<native high priority>",
    "P3": "<native medium priority>"
  },
  "type": "<default issue type for new items, or null for Linear>"
}
```

Ask:

> Does this fieldMap look correct? Reply with any corrections, or press Enter to accept.

Apply corrections and persist as `config.fieldMap` in `config.json`.

#### E.5 Persist stateCache

After confirming the statusMap (E.2/E.3) and fieldMap (E.4), write `config.backend.stateCache` to `.maestro/config.json`:

- **Linear:** a map of state name → `{ "id": "<state id>", "type": "<state type>" }` for every discovered state. Example:
  ```json
  { "In Progress": { "id": "abc123", "type": "started" }, "Done": { "id": "def456", "type": "completed" } }
  ```
- **Jira:** a map of status name → `{ "id": "<status id>", "transitionId": "<transition id>" }` for each reachable status on the project. To get transition IDs, issue `GET <url>/rest/api/3/issue/<sample-issue-key>/transitions` (using any existing issue) or the equivalent MCP/CLI call; if no issues exist yet, store the status IDs from the statuses endpoint and leave `transitionId` as `null` (it will be resolved on first use). Example:
  ```json
  { "In Progress": { "id": "3", "transitionId": "21" }, "Done": { "id": "10001", "transitionId": "31" } }
  ```

The adapter profile's `set_status` op reads `config.backend.stateCache` to resolve the correct native state ID and Jira transition ID without re-querying the API on every status change.

### Step F: Capture mode

Ask:

> How should Maestro capture fleeting ideas and raw notes?
>
> 1. **local** (default — items go to `.maestro/inbox.md` as bullets; triage converts them)
> 2. **backend** — capture creates a draft issue with `status:inbox` directly in the chosen backend

Record as `config.captureMode` in `.maestro/config.json`.

## State Management

Track progress in `.maestro/setup_state.json`. Get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it.
```json
{
  "status": "in_progress|complete",
  "project_type": "greenfield|brownfield",
  "current_section": "product|guidelines|tech_stack|workflow|styleguides|backend",
  "current_question": 1,
  "completed_sections": [],
  "started_at": "ISO_TIMESTAMP",
  "last_updated": "ISO_TIMESTAMP"
}
```

Setup is `complete` only after package assets are copied, all context sections are done, AND the backend flow (Steps C–F) is complete. `completed_sections` must contain all six: `product`, `guidelines`, `tech_stack`, `workflow`, `styleguides`, `backend`.

## Artifact Templates

The context files are not parsed by downstream skills, so each only needs the section structure below — populate every section from the Q&A answers, and keep them terse and scannable (tables, bullets, and checklists over prose).

### product.md

`## Name` · `## Description` · `## Problem Statement` · `## Target Users` · `## Key Goals`

### guidelines.md

`## Voice & Tone` · `## Design Principles` · `## Applying These`

### tech-stack.md

`## Primary Languages` · `## Frontend / Backend / Database` · `## Distribution & Infrastructure` · `## Key Layout` · `## Dependencies` · `## Validation Commands`

### workflow.md

`## TDD / Verification Discipline` · `## Commit Strategy` · `## Code Review` · `## Verification Checkpoints` · `## Work Item Lifecycle`

### context/styleguides/

One file per language chosen in Section 5 (e.g. `markdown.md`, `bash.md`, `json.md`). Each file: a one-line intro plus `## Formatting`, `## Conventions`, and `## Anti-patterns` sections with project-specific rules.

## Completion

For the **files** backend, print:

```
Setup complete!

Created: .maestro/CONTRACT.md
         .maestro/adapters/  (files.md + all adapter profiles)
         .maestro/config.json  (adapter: files, captureMode: <chosen>)
         .maestro/context/{product,guidelines,tech-stack,workflow}.md
         .maestro/context/styleguides/
         .maestro/work/
         .maestro/items/  (+ archived/{done,wont-fix,deferred,duplicate}/)
         .maestro/inbox.md

Next: Run /new-track in Claude Code or $new-track in Codex to create your first track.
```

For a **forge** backend (`gitea` / `github` / `gitlab`), print:

```
Setup complete!

Created: .maestro/CONTRACT.md
         .maestro/adapters/  (files.md + all adapter profiles)
         .maestro/config.json  (adapter: <chosen>, repo: <owner/name>, captureMode: <chosen>)
         .maestro/context/{product,guidelines,tech-stack,workflow}.md
         .maestro/context/styleguides/
         .maestro/work/
         .maestro/inbox.md

Bootstrap: <N> labels created in <backend> (transport: <mcp|cli|api>)

Next: Run /new-track in Claude Code or $new-track in Codex to create your first track.
```

For a **native-tracker** backend (`linear` / `jira`), print:

```
Setup complete!

Created: .maestro/CONTRACT.md
         .maestro/adapters/  (files.md + all adapter profiles)
         .maestro/config.json  (adapter: <linear|jira>, team/project: <key>, captureMode: <chosen>)
         .maestro/context/{product,guidelines,tech-stack,workflow}.md
         .maestro/context/styleguides/
         .maestro/work/
         .maestro/inbox.md

Discovery: <N> native states discovered (transport: <mcp|cli|api>)
           statusMap: <N> canonical statuses mapped, <N> unmapped
           fieldMap: priority (P1/P2/P3 → native), type: <type or null>

Next: Run /new-track in Claude Code or $new-track in Codex to create your first track.
```

## Resume

If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, and verify previously created files still exist. If a file from a completed section is missing, warn the user and re-run that section to regenerate it before continuing. If the `backend` section is incomplete, resume from the last unfinished step (C, D, E, or F).
