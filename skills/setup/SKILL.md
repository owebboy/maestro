---
name: setup
description: Use when starting a new project with Maestro, or when the conductor/ directory does not exist yet and needs initializing.
argument-hint: "[--resume]"
---

# Project Setup

Initialize project context through interactive Q&A. Creates the `conductor/` directory with foundational documents that inform all other workflow skills.

## Pre-flight

1. Check if `conductor/` already exists:
   - If `conductor/product.md` exists: ask whether to resume or reinitialize
   - If `conductor/setup_state.json` exists with incomplete status: offer to resume
2. Detect project type:
   - **Greenfield**: no .git, no package.json/go.mod/requirements.txt/Cargo.toml, no src/
   - **Brownfield**: any of the above exist — analyze existing code to pre-populate answers

## Interactive Q&A

**Rules:** Ask ONE question per turn. Wait for response. Offer 2-3 suggested answers plus "Type your own." Ask no more than 5 questions per section; some sections cap lower, as noted in each section heading. Save progress to `conductor/setup_state.json` after each step.

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

After Q&A, generate these files populated with answers:

| File | Purpose |
|------|---------|
| `conductor/index.md` | Navigation hub with links to all context docs |
| `conductor/product.md` | Product vision, problem, users, goals |
| `conductor/product-guidelines.md` | Voice, tone, design principles |
| `conductor/tech-stack.md` | Languages, frameworks, infra, dependencies |
| `conductor/workflow.md` | TDD policy, commits, reviews, verification rules |
| `conductor/tracks.md` | Track registry with standard table format |
| `conductor/code_styleguides/` | Language-specific conventions |

## State Management

Track progress in `conductor/setup_state.json`. Get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it.
```json
{
  "status": "in_progress|complete",
  "project_type": "greenfield|brownfield",
  "current_section": "product|guidelines|tech_stack|workflow|styleguides",
  "current_question": 1,
  "completed_sections": [],
  "started_at": "ISO_TIMESTAMP",
  "last_updated": "ISO_TIMESTAMP"
}
```

## tracks.md Format (CRITICAL)

The generated `conductor/tracks.md` MUST use this exact format. Downstream skills (`/new-track` in Claude Code or `$new-track` in Codex, and likewise `/status`, `/manage`, `/implement`, `/uat-create`) parse this table by convention:

```markdown
# Tracks Registry

## Status Legend

- `[ ]` Pending
- `[~]` In Progress
- `[x]` Completed

## Active Tracks

| Status | Track ID | Title | Created | Updated |
| ------ | -------- | ----- | ------- | ------- |

## Archived Tracks

<!-- Tracks archived via /manage in Claude Code or $manage in Codex appear here -->
```

Do NOT deviate from this table structure. The status column uses checkbox markers (`[ ]`, `[~]`, `[x]`). The Track ID column must match directory names under `conductor/tracks/`.

## Artifact Templates

`tracks.md` uses the strict format above (it is parsed by convention). The other artifacts are not parsed, so each only needs the section structure below — populate every section from the Q&A answers, and keep them terse and scannable (tables, bullets, and checklists over prose).

### index.md

A static navigation hub — no per-track rows (the track registry is `tracks.md`). Sections:

- `# Conductor Index` and a one-line intro
- `## Context Documents` — a bullet link to each of `product.md`, `product-guidelines.md`, `tech-stack.md`, `workflow.md`, `tracks.md`, and `code_styleguides/`, each with a one-line purpose
- `## Related (outside conductor/)` — links to `../README.md` and `../issues/`
- `## Quick Commands` — a table of common skills and what each does

### product.md

`## Name` · `## Description` · `## Problem Statement` · `## Target Users` · `## Key Goals`

### product-guidelines.md

`## Voice & Tone` · `## Design Principles` · `## Applying These`

### tech-stack.md

`## Primary Languages` · `## Frontend / Backend / Database` · `## Distribution & Infrastructure` · `## Key Layout` · `## Dependencies` · `## Validation Commands`

### workflow.md

`## TDD / Verification Discipline` · `## Commit Strategy` · `## Code Review` · `## Verification Checkpoints` · `## Track Lifecycle`

### code_styleguides/

One file per language chosen in Section 5 (e.g. `markdown.md`, `bash.md`, `json.md`). Each file: a one-line intro plus `## Formatting`, `## Conventions`, and `## Anti-patterns` sections with project-specific rules.

## Completion

```
Setup complete!

Created: conductor/{index,product,product-guidelines,tech-stack,workflow,tracks}.md
         conductor/code_styleguides/

Next: Run /new-track in Claude Code or $new-track in Codex to create your first track.
```

## Resume

If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, and verify previously created files still exist. If a file from a completed section is missing, warn the user and re-run that section to regenerate it before continuing.
