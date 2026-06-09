---
status: triaged
type: refactor
priority: P2
filed: 2026-06-09
---

# Issue: Rewrite all 15 skill descriptions trigger-first

## Summary

Every skill description leads with a capability/workflow summary and buries the trigger clause second. Models select skills on descriptions alone, and tested behavior shows they execute a workflow-summarizing description as a shortcut instead of reading the skill body.

## Problem Description

Confirmed 15/15 at `skills/*/SKILL.md:3`. The dangerous subset enumerates internal steps: codebase-review ("parallel review agents..., then parallel audit agents... Results go to issues/INBOX.md"), session-wrap-up ("reviews..., updates..., and commits" — omitting the body's rule to ignore pre-existing uncommitted changes, so a shortcutting model commits work it shouldn't), plus new-track, triage, implement, issue-advance, uat-run. Also: manage uses "Use for" and status "Use to" instead of "Use when".

Overlapping triggers compound the problem: implement and issue-advance both key on "ready" + "implement"; manage and issue-close both key on "archive". Add contrast clauses: implement → "if you only have a reviewed issue file, use issue-advance first"; issue-close → "issues only; for tracks use manage"; manage → "tracks only; for issues use issue-close".

## Acceptance Criteria

- [ ] All 15 descriptions start with "Use when..." and state triggering conditions only — no workflow steps
- [ ] Contrast clauses disambiguate implement/issue-advance and manage/issue-close
- [ ] agents/openai.yaml short_descriptions stay consistent with the new descriptions

## Technical Context

### Affected Files

- skills/*/SKILL.md:3 (all 15)
- skills/*/agents/openai.yaml (where short_description echoes the old phrasing)

### Related Tests

### Similar Patterns

Example rewrites: session-wrap-up → "Use when a Claude Code or Codex session is ending, the user is wrapping up, or says they're done for now." codebase-review → "Use when the user asks for a comprehensive codebase health check, full audit, or whole-repo security/performance/architecture review. Not for single-diff or PR review."

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification. Highest-leverage cross-LLM change in the review.
