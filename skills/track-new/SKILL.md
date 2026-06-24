---
name: track-new
description: Use when starting a new tracked feature, bug fix, refactor, or chore. For work that already has a reviewed item, use item-advance instead.
argument-hint: "<feature|bug|chore|refactor> <name>"
---

# Track New

Create a tracked work item (feature, bug fix, chore, or refactor) with a specification, then use Superpowers brainstorming and planning to produce the implementation plan.

## Progress Checklist

Copy this checklist and track your progress:

```
Track New Progress:
- [ ] Pre-flight: verify project initialized
- [ ] Step 1: Track classification (type)
- [ ] Step 2: Specification gathering (Q&A)
- [ ] Step 3: Item creation + spec generation → user approval
- [ ] Step 4: Spec → plan → link pipeline (design, plan, link, subtasks)
- [ ] Step 5: Set lifecycle status
```

## Pre-flight

1. Verify project is initialized:
   - `.maestro/config.json` must exist — if not, suggest running `/setup` in Claude Code or `$setup` in Codex first and stop
   - `.maestro/context/product.md`, `.maestro/context/tech-stack.md`, `.maestro/context/workflow.md` must exist — if any are missing, suggest running `/setup` first and stop
2. Load context: read `product.md`, `tech-stack.md`, `workflow.md` for project understanding

## Step 1: Track Classification

Determine type from argument or ask:
- **Feature** — new functionality
- **Bug** — fix for existing issue
- **Chore** — maintenance, dependencies, config
- **Refactor** — code improvement without behavior change

## Step 2: Specification Gathering

Ask ONE question per turn (max 6, tailored by type):

**Feature:** summary → user story → acceptance criteria → dependencies → out of scope → technical notes (optional)

**Bug:** summary → steps to reproduce → expected vs actual → affected areas → root cause hypothesis (optional)

**Chore/Refactor:** summary → motivation → success criteria → risk assessment

## Step 3: Item Creation + Spec Generation

1. Mint the item via `create_item({title, type, priority, body, weight: tracked})` → `id`
   - The adapter mints the id (LD-4: `{4-digit-seq}-{slug}`)
   - Do NOT generate or validate an id yourself; do NOT check any tracks list for uniqueness — the adapter is the registry
   - `body` = the structured item-record body for the registry: the LD-3 sections (Summary, Problem Description, Acceptance Criteria, Technical Context, Dependencies, Out of Scope, Notes) as a concise record — NOT the full spec prose. The full prose spec is written separately to `.maestro/work/<id>/spec.md` (see step 2) and linked via `link_artifact`. Do not write the entire spec into `body`, and do not duplicate content between `body` and `spec.md`.

2. Write the spec prose to `.maestro/work/<id>/spec.md` (get today's date by running `date +%Y-%m-%d` — do not assume you know it):

```markdown
# Specification: {Title}

**Item ID:** {id}
**Type:** {type}
**Created:** {date}
**Status:** Draft

## Summary
## Context
## Acceptance Criteria
- [ ] ...
## Dependencies
## Out of Scope
## Technical Notes
```

3. Show spec to user for review. Wait for approval before proceeding.

## Step 4: Spec → Plan → Link Pipeline

Run the shared [Spec → Plan → Link pipeline](../../docs/spec-plan-pipeline.md) with the approved spec and the item `id`: design via brainstorming, plan via writing-plans, then link artifacts and mirror plan tasks as subtasks.

## Step 5: Set Lifecycle Status

After the pipeline completes: `set_status(id, planned)`

## Error Handling

- **Superpowers writes files to wrong location**: Move the file to the correct `.maestro/work/<id>/` path and delete the external copy. Check both `docs/superpowers/specs/`, `docs/superpowers/plans/`, `docs/specs/`, and `docs/plans/` as common default locations.
- **create_item fails**: Report the error; do not attempt to create the item manually or fall back to writing files without an id.
- **Spec rejected by user**: Return to Step 2 (specification gathering) and re-ask the relevant questions.
- **Brainstorming or planning skill fails**: Fall back to the inline alternative for that step and continue.

## Completion

```
Item created: {id}
Location: .maestro/work/{id}/

Files:
  spec.md    — requirements
  design.md  — approved design
  plan.md    — implementation plan

Status: planned

Next: Run /implement {id} in Claude Code or $implement {id} in Codex to start implementation.
```
