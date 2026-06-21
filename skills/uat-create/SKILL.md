---
name: uat-create
description: Use when completed work items need a UAT acceptance-test checklist. For running an existing checklist, use uat-run.
argument-hint: "[item-refs...]"
---

# UAT Create

Generate a UAT checklist from completed work items not yet covered by existing UAT files.

## Process

1. **Scan for uncovered items**
   - Call `list_items({status: done})` — returns all completed items
   - Scan `.maestro/work/uat/UAT-*.md` — extract item IDs mentioned in the header of each file
   - Diff: uncovered = completed items not referenced in any UAT file
   - If specific item IDs are provided as arguments, filter to only those

2. **Filter for UAT-testable items**
   - For each uncovered item: call `get_item(id)` to get the record, then read `.maestro/work/<id>/spec.md` for acceptance criteria
   - Include items with runtime-observable behavior (UI changes, data output changes, API changes, workflow changes)
   - Exclude internal-only changes (defensive guards, code cleanup, type fixes) — mention these as "verified by unit tests only" in the prerequisites section

3. **Build test sections** for each UAT-testable item:
   - Extract acceptance criteria from the item's spec.md
   - Convert each criterion to a numbered test item: `- [ ] **N.M — description:** what to verify`
   - Add setup instructions (what state/environment is needed)
   - Group related items into shared sections where they test overlapping behavior
   - Add validation steps based on available tools:
     - If database MCP tools are available: generate SQL validation queries in ```sql blocks with `-- Expected:` comments
     - If test commands exist: generate shell commands to run relevant tests
     - Otherwise: describe manual verification steps

4. **Check for blockers**
   - If an item depends on deployment or other items, add `**Blocked by:**` annotation
   - Cross-reference prerequisites from prior UAT files for recurring dependencies

5. **Draft the checklist** (in memory — do not write the file yet)
   - Target file will be `.maestro/work/uat/UAT-YYYY-MM-DD.md`. Get today's date by running `date +%Y-%m-%d` — do not assume you know it.
   - Draft the full content using the Format Reference below:
     - Header with item ID list and "Any failures go to `.maestro/inbox.md` via capture"
     - Prerequisites section
     - Numbered test sections with `---` separators
     - Results summary table at the bottom

6. **Present, approve, then write**
   - Present the drafted checklist to the user for review.
   - Wait for explicit approval before writing. Use `AskUserQuestion` if available; otherwise ask in plain text and stop until the user approves.
   - After approval, write the checklist to `.maestro/work/uat/UAT-YYYY-MM-DD.md`.

## Format Reference

```markdown
# User Acceptance Testing Checklist — YYYY-MM-DD

Validates `item-id-a`, `item-id-b`, and `item-id-c`.

Any failures go to `.maestro/inbox.md` via capture.

## Prerequisites

- List deployment requirements
- Note which items are internal-only (verified by unit tests)

---

## 1. Section Title (`item-id`)

### Setup
- State/environment needed for these tests

### Tests

- [ ] **1.1 — Test name:** What to verify
- [ ] **1.2 — Test name:** What to verify

### Validation
<!-- SQL queries, shell commands, or manual steps depending on available tools -->

---

## Results Summary

| Section | Pass | Fail | Blocked |
|---------|------|------|---------|
| 1. Section Title | | | |
```
