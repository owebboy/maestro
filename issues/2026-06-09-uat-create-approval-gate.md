---
status: triaged
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: uat-create writes the checklist before its own approval gate

## Summary

Step 5 writes `conductor/UAT-YYYY-MM-DD.md` to disk, but step 6 says to present the checklist "for review before saving" — the gate sits after the write it is meant to guard.

## Problem Description

A model following the numbered steps literally saves the file in step 5, making step 6's "before saving" impossible; a careful model stalls on the contradiction. Either way the intended approval gate is defeated or ambiguous on every platform. Reorder to draft → present and wait for approval → write.

## Acceptance Criteria

- [ ] Step 5 drafts the checklist without writing the file
- [ ] Step 6 presents the draft, waits for explicit approval, then writes the file
- [ ] The wait is phrased platform-neutrally (AskUserQuestion if available, otherwise ask in plain text and stop)

## Technical Context

### Affected Files

- skills/uat-create/SKILL.md:39-47 (steps 5-6)

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification.
