---
status: triaged
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: manage restore corrupts status for non-completed tracks; --list has no body

## Summary

Restore unconditionally sets `status: "completed"`, so restoring a track archived as abandoned or superseded marks half-finished work complete. Separately, `--list` appears in the modes table and menu but has no body section.

## Problem Description

Archive explicitly allows archiving in-progress tracks with reasons superseded/abandoned (SKILL.md:30-31), but Restore step 4 (line 45) writes `archived: false`, `status: "completed"` regardless. A model follows this literally and corrupts metadata on every platform. Fix: record `status_at_archive` during Archive and restore that value, asking the user if absent. The `--list` mode (lines 21, 81) is declared in the modes table, the interactive menu, and openai.yaml, but no section defines what it outputs — models improvise.

## Acceptance Criteria

- [ ] Archive records the pre-archive status (e.g., `status_at_archive` in metadata.json)
- [ ] Restore reinstates that status, asking the user when it is absent
- [ ] A `--list` section defines its output format

## Technical Context

### Affected Files

- skills/manage/SKILL.md:21,30-31,45,81
- skills/manage/agents/openai.yaml

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
