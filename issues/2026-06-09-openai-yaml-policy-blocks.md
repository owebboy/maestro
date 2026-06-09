---
status: triaged
type: chore
priority: P3
filed: 2026-06-09
---

# Issue: Five openai.yaml files omit the allow_implicit_invocation policy block

## Summary

new-track, status, triage, uat-create, and setup omit the `policy: allow_implicit_invocation` block their ten siblings set — and several are file-writing skills, so the omission errs in the unsafe direction.

## Problem Description

Ten skills set an explicit policy; five rely on the Codex default. For file-writing skills (new-track, triage, uat-create, setup) the missing block means Codex may invoke them implicitly where siblings with equal risk (e.g., issue-close) require explicit invocation. Decide the intended default per skill and state it explicitly everywhere so the plugin-wide convention holds. Also: issue-review's short_description omits its argument and batch modes, and session-wrap-up's short_description is keyword-poor for discovery — fix while in these files.

## Acceptance Criteria

- [ ] All 15 agents/openai.yaml files carry an explicit `policy: allow_implicit_invocation` value
- [ ] File-writing skills are explicit-only unless deliberately decided otherwise
- [ ] short_descriptions reviewed for accuracy alongside the policy pass

## Technical Context

### Affected Files

- skills/new-track/agents/openai.yaml
- skills/status/agents/openai.yaml
- skills/triage/agents/openai.yaml
- skills/uat-create/agents/openai.yaml
- skills/setup/agents/openai.yaml
- skills/issue-review/agents/openai.yaml (short_description)
- skills/session-wrap-up/agents/openai.yaml (short_description)

### Related Tests

### Similar Patterns

## Dependencies

Coordinate with the trigger-first description rewrite (2026-06-09-trigger-first-descriptions.md) to avoid editing the same files twice.

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
