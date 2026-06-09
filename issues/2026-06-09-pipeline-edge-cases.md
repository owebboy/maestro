---
status: triaged
type: refactor
priority: P3
filed: 2026-06-09
---

# Issue: Add missing edge-case handling across pipeline skills

## Summary

Several pipeline skills lack one-line guards for predictable failure states (file absent, already closed, zero matching items), leaving weaker models to improvise.

## Problem Description

Per-skill gaps, each fixable with "if X, tell the user and stop":

- **issue-close** (SKILL.md:13-36): missing issue file, already-closed issue, absent `status` field; the closing-note step references a `## Notes` section the issue template does contain but the reference format for `duplicate-of` is unspecified.
- **issue-advance** (SKILL.md:13-28,51): nonexistent path, zero reviewed issues for `all`, unexpected status; the `<track-id>` used in the archive step has no stated source; step 4's confirmation flow contradicts itself.
- **issue-review** (SKILL.md:15-17,52): missing file, wrong status, empty `all` set; final summary has no output format.
- **uat-run** (SKILL.md:11-23,67-71): absent or non-matching UAT file, "most recent" undefined; INBOX append does not target the `## Inbox` section or handle a missing INBOX.md.
- **status** (SKILL.md:28-30,77-82): malformed or missing issue frontmatter; no rule for picking "Active" when multiple tracks are in progress.
- **implement** (SKILL.md:29-32,135-138): pre-flight has no failure action; the git fallback for phase file scope omits how to get the parent SHA and the no-match case.
- **manage** (SKILL.md:24-26): pre-flight has no failure path when conductor/ is missing.

## Acceptance Criteria

- [ ] Each listed gap has an explicit guard or definition
- [ ] Guards are phrased identically across skills ("If X, inform the user and stop")

## Technical Context

### Affected Files

- skills/issue-close/SKILL.md
- skills/issue-advance/SKILL.md
- skills/issue-review/SKILL.md
- skills/uat-run/SKILL.md
- skills/status/SKILL.md
- skills/implement/SKILL.md
- skills/manage/SKILL.md

### Related Tests

### Similar Patterns

triage/SKILL.md's Error Handling section is the in-repo model to copy.

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review (low-severity long tail, grouped).
