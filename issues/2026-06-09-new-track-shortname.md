---
status: triaged
type: bug
priority: P3
filed: 2026-06-09
---

# Issue: new-track never defines how to derive {shortname} for track IDs

## Summary

Track IDs use `{shortname}_{YYYYMMDD}` but the skill never specifies how to derive the shortname from the track name, so two models produce two naming schemes and cross-references break.

## Problem Description

SKILL.md:53 introduces `{shortname}` with no derivation rule — no casing, separator, word-count, or length constraint. Examples elsewhere in the repo suggest lowercase hyphenated ("nav-fix_20260402", "auth_20260403") but nothing normative says so. Downstream skills (implement, status, manage) match tracks by ID, so inconsistent derivation creates orphans. Also fold in: the completion message (line 145) hardcodes "(from Superpowers)" even when the inline fallback produced the plan.

## Acceptance Criteria

- [ ] A normative derivation rule (e.g., "2-3 lowercase hyphenated words from the track name, max 20 chars") with one example
- [ ] Completion message reflects which engine actually produced the plan

## Technical Context

### Affected Files

- skills/new-track/SKILL.md:53,145

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
