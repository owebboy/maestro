---
status: triaged
type: refactor
priority: P2
filed: 2026-06-09
---

# Issue: Use dual-harness syntax in cross-skill references; inline the INBOX bootstrap

## Summary

Several skills reference siblings with bare Claude-only slash syntax (`/triage`, `/new-track`) in completion messages and bootstrap notes, and two skills defer to "the /triage bootstrap" — cross-skill recall a model on another harness does not have.

## Problem Description

Affected: setup (lines 90, 108, 121), status (lines 14-15, 63, 79), issue-advance (lines 17, 44, 60-61), session-wrap-up (line 64), codebase-review (line 87). Other skills already model the dual form well ("Run /uat-create in Claude Code or $uat-create in Codex" — implement:242). Separately, implement:176 and session-wrap-up:64 say to bootstrap issues/INBOX.md "same as /triage bootstrap" without a path or content; inline the three-line INBOX skeleton instead so the step works without loading another skill.

## Acceptance Criteria

- [ ] Every cross-skill reference names both forms ("/x in Claude Code or $x in Codex") or uses harness-neutral phrasing ("run the x skill")
- [ ] implement and session-wrap-up inline the INBOX.md bootstrap content instead of deferring to /triage

## Technical Context

### Affected Files

- skills/setup/SKILL.md:90,108,121
- skills/status/SKILL.md:14-15,63,79
- skills/issue-advance/SKILL.md:17,44,60-61
- skills/session-wrap-up/SKILL.md:64
- skills/implement/SKILL.md:176
- skills/codebase-review/SKILL.md:87

### Related Tests

### Similar Patterns

skills/implement/SKILL.md:242 shows the correct dual form.

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review (recurring pattern across 6 units).
