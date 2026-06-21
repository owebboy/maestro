---
name: status
description: Use when getting oriented at the start of a session, or checking overall progress, active work items, and next actions.
argument-hint: "[ref]"
---

# Project Status

Display current status of the project: overall progress, work item board, and next actions.

## Pre-flight

1. Read `.maestro/context/product.md` for project name and description.
   - If missing: suggest running `/setup` in Claude Code or `$setup` in Codex first.
2. Read `.maestro/inbox.md` and count top-level bullet items (lines beginning with `- `) under `## Inbox` for the raw inbox count — match what triage processes; ignore continuation lines, blanks, and headers.
3. Call `list_items({})` to retrieve all items.
   - If the result is empty and inbox count is 0: show setup-complete message, suggest `/new-track` in Claude Code or `$new-track` in Codex.

## Data: Board counts

From the `list_items({})` result:

- **By status:** count items per canonical status (`inbox`, `triaged`, `reviewed`, `planned`, `in-progress`, `in-review`, `done`, `wont-fix`, `deferred`, `duplicate`). Omit statuses with zero items.
- **By priority:** count items per `priority` value (`P1`, `P2`, `P3`). Omit priorities with zero items.
- **By weight:** count `tracked` items vs `light` items.
- **Updated date** (for the ACTIVE ITEMS table): use each record's `updated` field from the normalized record.

## Output: Full Status (no argument)

```
PROJECT STATUS: {Project Name}
{Project Description — one line, from product.md}

BOARD
Status breakdown:
  in-progress  2
  reviewed     3
  triaged      1
  done         5
  (omit zero-count statuses)

Priority breakdown:
  P1  1
  P2  4
  P3  1

Weight: {N} tracked  |  {M} light

Inbox: {inbox_bullet_count} unprocessed

ACTIVE ITEMS  (status: in-progress or in-review, sorted P1 first)
| Priority | ID | Title | Weight | Updated |
|----------|----|-------|--------|---------|
| P1 | 0007-auth-bug | Auth token not refreshing | light | 2026-04-03 |
| P2 | 0012-dashboard | Dashboard charts | tracked | 2026-04-03 |

NEXT UP  (status: planned or reviewed, sorted P1 first, max 5)
| Priority | ID | Title | Weight |
|----------|-----|-------|--------|
| P2 | 0015-nav-fix | Nav collapses on mobile | light |

Commands (Claude Code / Codex): /implement {id} | /new-track | /manage | /triage | /issue-review
```

## Output: Single Item (with ref argument)

Call `get_item(ref)`.

Show:
- **ID / Title / Type** (from record)
- **Status / Priority / Weight** (canonical values from record)
- **Artifacts** (from `artifacts` list — kind + ref for each)
- **Tasks progress** (for `weight: tracked` items only): count subtasks by state (`todo`/`doing`/`done`); render as `done/total (X%)`. List any `doing` subtasks by title.
- **Links** (from `links` list, if any)

If no item found: list active item IDs with suggestion.

## Empty States

- No items and inbox empty: "No work yet. Run /new-track in Claude Code or $new-track in Codex to create one."
- Ref not found: list available item IDs with suggestion.
- No active (in-progress/in-review) items: omit ACTIVE ITEMS section.
- No planned/reviewed items: omit NEXT UP section.
