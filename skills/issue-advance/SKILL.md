---
name: issue-advance
description: Use when a reviewed work item is ready to grow a spec and plan (promote to tracked), or "all" to batch-promote. For an item that already has a plan, use implement.
argument-hint: "<item-ref> | all"
---

# Issue Advance

Promote a reviewed work item to tracked in place — no new id minted, no file moved.

**Argument:** item ref (id, slug, or `work/<id>` path) or `all` to batch-promote all reviewed items

## Pre-flight

1. **Verify project is initialized:**
   - `.maestro/config.json` must exist — if not, suggest running `/setup` in Claude Code or `$setup` in Codex first and stop
   - `.maestro/context/product.md`, `.maestro/context/tech-stack.md`, `.maestro/context/workflow.md` must exist — if any are missing, suggest running `/setup` first and stop

2. **Load context:** read `product.md`, `tech-stack.md`, `workflow.md` for project understanding

3. **Batch mode** (`all` argument):
   - Call `list_items({status: reviewed})` to get all reviewed items
   - If no reviewed items are found, inform the user and stop
   - Sort by priority (P1 first, then P2, then P3)
   - Present the sorted list and ask the user to confirm which to promote
   - Promote each confirmed item using the Process below

## Process (per item)

### Step 1: Load item

1. Call `get_item(ref)` to load the item
2. Check `status`:
   - If `reviewed` — proceed
   - If `triaged` — suggest running `/issue-review` in Claude Code or `$issue-review` in Codex first, then stop
   - Any other status — inform the user and stop
3. Note the existing `id` — this is the permanent identity. **Do NOT mint a new id.**

### Step 2: Spec generation

Write the spec prose to `.maestro/work/<id>/spec.md` (get today's date by running `date +%Y-%m-%d` — do not assume you know it), drawing content from the item record:

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

Show the spec to the user for review. Wait for approval before proceeding.

### Step 3: Spec → Plan → Link Pipeline

Run the shared [Spec → Plan → Link pipeline](../../docs/spec-plan-pipeline.md) with the approved spec and the existing item `id`: design via brainstorming, plan via writing-plans, then link artifacts and mirror plan tasks as subtasks.

### Step 4: Promote, Set Status, Record Provenance

After the pipeline completes:

1. **Promote weight:** `update_item(id, { weight: tracked })`

2. **Set lifecycle status:** `set_status(id, planned)`

3. **Add provenance note:** `comment(id, "Promoted to tracked from reviewed.")`

## Error Handling

- **Item not found**: Report the error and stop. Do not attempt to create a new item.
- **Spec rejected by user**: Return to Step 2 and revise the spec based on user feedback.
- **Brainstorming or planning skill fails**: Fall back to the inline alternative for that step and continue.
- **Superpowers writes files to wrong location**: Move the file to the correct `.maestro/work/<id>/` path and delete the external copy. Check both `docs/superpowers/specs/`, `docs/superpowers/plans/`, `docs/specs/`, and `docs/plans/` as common default locations.
- **Batch mode conflict**: If two reviewed items appear to cover the same problem, ask the user whether to promote them separately or consolidate — do not merge automatically.

## Completion

```
Item promoted: {id}
Location: .maestro/work/{id}/

Files:
  spec.md    — requirements
  design.md  — approved design
  plan.md    — implementation plan

Status: planned
Weight: tracked

Next: Run /implement {id} in Claude Code or $implement {id} in Codex to start implementation.
```
