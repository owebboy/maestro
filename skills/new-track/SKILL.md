---
name: new-track
description: Use when starting a new tracked feature, bug fix, refactor, or chore. For work that already has a reviewed item, use issue-advance instead.
argument-hint: "<feature|bug|chore|refactor> <name>"
---

# New Track

Create a tracked work item (feature, bug fix, chore, or refactor) with a specification, then use Superpowers brainstorming and planning to produce the implementation plan.

## Progress Checklist

Copy this checklist and track your progress:

```
New Track Progress:
- [ ] Pre-flight: verify project initialized
- [ ] Step 1: Track classification (type)
- [ ] Step 2: Specification gathering (Q&A)
- [ ] Step 3: Item creation + spec generation → user approval
- [ ] Step 4: Design via brainstorming
- [ ] Step 5: Plan via writing-plans
- [ ] Step 6: Artifact linking + subtasks + lifecycle
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

## Step 4: Design via Brainstorming

Detect `brainstorming` using the [detection procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory). Check both plugin-prefixed and bare forms, and use whichever invocation form was found.

If available, invoke the brainstorming skill using the detected form. Pass the approved spec as context AND instruct it to write its design doc to `.maestro/work/<id>/design.md`. Example invocation context:

> Design a solution for the following specification. Write the design document to `.maestro/work/<id>/design.md`.
>
> {spec content}

If Superpowers writes the design doc elsewhere despite the instruction (e.g., `docs/superpowers/specs/` or `docs/specs/`), move it to `.maestro/work/<id>/design.md` and delete the external file.

If Superpowers is not installed, run an inline design discussion:
1. Propose 2-3 implementation approaches based on the spec
2. Present trade-offs for each
3. Get user approval on approach
4. Write the approved design to `.maestro/work/<id>/design.md`

## Step 5: Plan via Writing Plans

Detect `writing-plans` using the [detection procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory). Check both plugin-prefixed and bare forms, and use whichever invocation form was found.

If available, invoke the writing-plans skill using the detected form. Instruct it to write the plan to `.maestro/work/<id>/plan.md`. Example invocation context:

> Create an implementation plan based on the approved design at `.maestro/work/<id>/design.md`. Write the plan to `.maestro/work/<id>/plan.md`.

If Superpowers writes the plan elsewhere despite the instruction (e.g., `docs/superpowers/plans/` or `docs/plans/`), move it to `.maestro/work/<id>/plan.md` and delete the external file. `/implement` reads this path directly — the plan MUST be there.

If Superpowers is not installed, generate a phased plan inline:
- Group tasks into logical phases
- Each task: description, files to modify, test to write, verification step
- Write plan directly to `.maestro/work/<id>/plan.md`

## Step 6: Artifact Linking + Subtasks + Lifecycle

After all prose is written:

1. **Link artifacts** (one call per artifact):
   - `link_artifact(id, spec, .maestro/work/<id>/spec.md)`
   - `link_artifact(id, design, .maestro/work/<id>/design.md)`
   - `link_artifact(id, plan, .maestro/work/<id>/plan.md)`

2. **Mirror plan tasks as subtasks:** parse the plan for phase/task entries; call `set_subtasks(id, [{ref, title, state: todo} for each plan task])` where `ref` = the plan's phase.task number (e.g. `1.1`, `1.2`, `2.1`). This is the coarse progress store — detailed TDD steps remain in the plan file.

3. **Set lifecycle status:** `set_status(id, planned)`

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
