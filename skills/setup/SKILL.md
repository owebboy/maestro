---
name: setup
description: Use when starting a new project with Maestro, or when the .maestro/ directory does not exist yet and needs initializing. Interactively collects project context, lets you choose a work-item backend (files/gitea/github/gitlab), and bootstraps it.
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

Record the choice as `config.adapter` in `.maestro/config.json`.

### Step D: Connection capture (forge backends only)

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

### Step E: Label bootstrap

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
         .maestro/adapters/  (files.md + all forge profiles)
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
         .maestro/adapters/  (files.md + all forge profiles)
         .maestro/config.json  (adapter: <chosen>, repo: <owner/name>, captureMode: <chosen>)
         .maestro/context/{product,guidelines,tech-stack,workflow}.md
         .maestro/context/styleguides/
         .maestro/work/
         .maestro/inbox.md

Bootstrap: <N> labels created in <backend> (transport: <mcp|cli|api>)

Next: Run /new-track in Claude Code or $new-track in Codex to create your first track.
```

## Resume

If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, and verify previously created files still exist. If a file from a completed section is missing, warn the user and re-run that section to regenerate it before continuing. If the `backend` section is incomplete, resume from the last unfinished step (C, D, E, or F).
