---
id: 0120-2026-06-09-validation-hook-feedback
title: 2026-06-09-validation-hook-feedback
type: bug
priority: P1
status: done
weight: light
created: 2026-06-09
updated: 2026-06-09
---

# 2026-06-09-validation-hook-feedback

# Issue: validate-issue-frontmatter hook feedback never reaches the model

## Summary

The validation hook prints warnings to stdout and exits 0, but Claude Code only feeds PostToolUse feedback to the model via exit code 2 with stderr (or structured JSON), so the hook's warnings do nothing.

## Problem Description

Both warning paths in `validate-issue-frontmatter.sh` — the missing-frontmatter warning (line 19) and the validation-error list (lines 50-52) — echo to stdout and exit 0. For PostToolUse hooks, exit-0 stdout appears only in the transcript view; the model never sees it and cannot fix the malformed frontmatter. The hook's entire purpose is defeated. A minor related defect: the error list prints literal `\n` sequences under bash (lines 27-46).

## Acceptance Criteria

- [ ] Validation errors go to stderr with exit 2 so the model receives them
- [ ] The missing-frontmatter warning uses the same mechanism
- [ ] Error list renders real newlines (use printf with %b or separate echo calls)
- [ ] Writing an issue file with a bad `status:` value in Claude Code produces visible model feedback

## Technical Context

### Affected Files

- bin/hooks/validate-issue-frontmatter.sh:19-20, 27-46, 50-52

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification.

## Notes

> Migrated from issue `2026-06-09-validation-hook-feedback.md`.
