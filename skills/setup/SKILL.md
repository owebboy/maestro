---
name: setup
description: Use when starting a new project with Maestro, or when the .maestro/ directory does not exist yet and needs initializing.
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

Copy the three package assets from `assets/maestro/` into `.maestro/`. These are idempotent — overwrite `CONTRACT.md` and `adapters/files.md` on every run (they are package-managed); NEVER overwrite `.maestro/config.json` if it already exists (it is project-owned).

| Source (package) | Destination |
|---|---|
| `assets/maestro/CONTRACT.md` | `.maestro/CONTRACT.md` |
| `assets/maestro/adapters/files.md` | `.maestro/adapters/files.md` |
| `assets/maestro/config.template.json` | `.maestro/config.json` (only if not already present) |

### Step B: Generate context files

Generate these files populated with Q&A answers:

| File | Purpose |
|------|---------|
| `.maestro/context/product.md` | Product vision, problem, users, goals |
| `.maestro/context/guidelines.md` | Voice, tone, design principles |
| `.maestro/context/tech-stack.md` | Languages, frameworks, infra, dependencies |
| `.maestro/context/workflow.md` | TDD policy, commits, reviews, verification rules |
| `.maestro/context/styleguides/markdown.md` | Markdown conventions |
| `.maestro/context/styleguides/bash.md` | Bash conventions |
| `.maestro/context/styleguides/json.md` | JSON conventions |

Also create the following empty directories and files:

| Path | Notes |
|------|-------|
| `.maestro/work/` | Prose artifacts dir (spec.md, design.md, plan.md per item) |
| `.maestro/items/` | Files-adapter registry root |
| `.maestro/items/archived/done/` | Archived terminal: done |
| `.maestro/items/archived/wont-fix/` | Archived terminal: wont-fix |
| `.maestro/items/archived/deferred/` | Archived terminal: deferred |
| `.maestro/items/archived/duplicate/` | Archived terminal: duplicate |
| `.maestro/inbox.md` | Pre-triage scratch (create from template if not present) |

The inbox template (written only if `.maestro/inbox.md` does not already exist):
```
# Inbox

Pre-triage scratch. One bullet per raw item; triage converts these into work items.

## Inbox
```

## State Management

Track progress in `.maestro/setup_state.json`. Get the current timestamp by running `date -u +%Y-%m-%dT%H:%M:%SZ` — do not assume you know it.
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

Setup is `complete` only after both package assets are copied AND all context sections are done (`completed_sections` contains all five: `product`, `guidelines`, `tech_stack`, `workflow`, `styleguides`).

## Artifact Templates

The context files are not parsed by downstream skills, so each only needs the section structure below — populate every section from the Q&A answers, and keep them terse and scannable (tables, bullets, and checklists over prose).

### product.md

`## Name` · `## Description` · `## Problem Statement` · `## Target Users` · `## Key Goals`

### guidelines.md

`## Voice & Tone` · `## Design Principles` · `## Applying These`

### tech-stack.md

`## Primary Languages` · `## Frontend / Backend / Database` · `## Distribution & Infrastructure` · `## Key Layout` · `## Dependencies` · `## Validation Commands`

### workflow.md

`## TDD / Verification Discipline` · `## Commit Strategy` · `## Code Review` · `## Verification Checkpoints` · `## Track Lifecycle`

### context/styleguides/

One file per language chosen in Section 5 (e.g. `markdown.md`, `bash.md`, `json.md`). Each file: a one-line intro plus `## Formatting`, `## Conventions`, and `## Anti-patterns` sections with project-specific rules.

## Completion

```
Setup complete!

Created: .maestro/CONTRACT.md
         .maestro/adapters/files.md
         .maestro/config.json
         .maestro/context/{product,guidelines,tech-stack,workflow}.md
         .maestro/context/styleguides/
         .maestro/work/
         .maestro/items/  (+ archived/{done,wont-fix,deferred,duplicate}/)
         .maestro/inbox.md

Next: Run /new-track in Claude Code or $new-track in Codex to create your first track.
```

## Resume

If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, and verify previously created files still exist. If a file from a completed section is missing, warn the user and re-run that section to regenerate it before continuing.
