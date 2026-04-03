---
name: uat-create
description: Generates a UAT checklist from completed conductor tracks with test sections, validation steps, and results summary. Use when completed tracks need acceptance testing
argument-hint: "[track-ids...]"
---

# UAT Create

Generate a UAT checklist from completed tracks not yet covered by existing UAT files.

## Process

1. **Scan for uncovered tracks**
   - Read `conductor/tracks.md` — collect all `[x]` completed tracks from BOTH the Active Tracks and Archived Tracks sections (archival should not skip UAT)
   - Read each existing `conductor/UAT-*.md` — extract track IDs mentioned in the header
   - Diff: uncovered = completed tracks not referenced in any UAT file
   - If specific track IDs are provided as arguments, filter to only those
   - For archived tracks, read spec.md from `conductor/tracks/_archive/{id}/` instead of `conductor/tracks/{id}/`

2. **Filter for UAT-testable tracks**
   - Read each uncovered track's `spec.md`
   - Include tracks with runtime-observable behavior (UI changes, data output changes, API changes, workflow changes)
   - Exclude internal-only changes (defensive guards, code cleanup, type fixes) — mention these as "verified by unit tests only" in the prerequisites section

3. **Build test sections** for each UAT-testable track:
   - Extract acceptance criteria from spec.md
   - Convert each criterion to a numbered test item: `- [ ] **N.M — description:** what to verify`
   - Add setup instructions (what state/environment is needed)
   - Group related tracks into shared sections where they test overlapping behavior
   - Add validation steps based on available tools:
     - If database MCP tools are available: generate SQL validation queries in ```sql blocks with `-- Expected:` comments
     - If test commands exist: generate shell commands to run relevant tests
     - Otherwise: describe manual verification steps

4. **Check for blockers**
   - If a track depends on deployment or other tracks, add `**Blocked by:**` annotation
   - Cross-reference prerequisites from prior UAT files for recurring dependencies

5. **Write the checklist**
   - File: `conductor/UAT-YYYY-MM-DD.md` (today's date)
   - Format:
     - Header with track list and "Any failures should go through `issues/INBOX.md` for triage"
     - Prerequisites section
     - Numbered test sections with `---` separators
     - Results summary table at the bottom

6. **Present** the generated checklist for review before saving

## Format Reference

```markdown
# User Acceptance Testing Checklist — YYYY-MM-DD

Validates `track-a`, `track-b`, and `track-c`.

Any failures should go through `issues/INBOX.md` for triage.

## Prerequisites

- List deployment requirements
- Note which tracks are internal-only (verified by unit tests)

---

## 1. Section Title (`track-id`)

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
