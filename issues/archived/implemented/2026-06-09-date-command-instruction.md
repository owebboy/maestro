---
status: implemented
type: refactor
priority: P2
filed: 2026-06-09
implemented: 2026-06-09
---

# Issue: Instruct models to run `date` wherever skills write dates

## Summary

Seven-plus skills require today's date (issue filenames, `closed:` fields, UAT filenames, timestamps, staleness math) and none instruct the model to obtain it. LLMs reliably guess the current date wrong from priors.

## Problem Description

Affected locations include: triage (issue filenames `YYYY-MM-DD-<slug>.md`), issue-close (`closed: YYYY-MM-DD`, line 29), uat-create (UAT filename), codebase-review (source tags, lines 78-82), new-track (four date/timestamp sites: lines 53, 63, 121-122, 127), setup (ISO timestamps in setup_state.json, lines 83-84), manage (timestamp writes and staleness math, lines 34, 71), uat-run (summary date ambiguity, lines 87-88), and templates/issue-file.md. One sentence fixes each: "Get today's date by running `date +%Y-%m-%d` — do not assume you know it."

## Acceptance Criteria

- [ ] Every skill step that writes a date or timestamp instructs the model to run `date` first
- [ ] uat-run disambiguates checklist date vs today's date in the summary

## Technical Context

### Affected Files

- skills/triage/SKILL.md
- skills/issue-close/SKILL.md:29
- skills/uat-create/SKILL.md
- skills/codebase-review/SKILL.md:78-82
- skills/new-track/SKILL.md:53,63,121-122,127
- skills/setup/SKILL.md:83-84
- skills/manage/SKILL.md:34,71
- skills/uat-run/SKILL.md:87-88

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review (recurring pattern across 8 units).
