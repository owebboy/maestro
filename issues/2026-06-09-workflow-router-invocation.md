---
status: triaged
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: workflow-router invocation policy is inverted on both platforms

## Summary

`user-invocable: false` kills the "user invokes directly" trigger in Claude Code while `allow_implicit_invocation: false` kills the "user asks which workflow" trigger in Codex — each platform honors only half the description, and README, INSTALL.md, and the frontmatter each tell a different story.

## Problem Description

The description names two triggers: "the user asks which Maestro workflow to use" and "invokes the router directly". In Claude Code, `user-invocable: false` (SKILL.md:4) removes `/workflow-router`, so direct invocation is impossible there. In Codex, `allow_implicit_invocation: false` (openai.yaml:7) means the model never loads the skill when the user merely asks which workflow to use. README:150 says "Auto in Claude, explicit `$workflow-router` in Codex"; INSTALL.md:93 calls it "Explicit-only helper". This is a zero-risk, read-only advisory skill, so implicit invocation carries no danger.

## Acceptance Criteria

- [ ] `allow_implicit_invocation: true` in agents/openai.yaml (or a deliberate decision documented otherwise)
- [ ] Description triggers match what each platform actually permits
- [ ] README:150, codex/INSTALL.md:93, and the skill frontmatter tell the same story

## Technical Context

### Affected Files

- skills/workflow-router/SKILL.md:3-4
- skills/workflow-router/agents/openai.yaml:7
- README.md:150
- codex/INSTALL.md:93

### Related Tests

### Similar Patterns

## Dependencies

Coordinate with the trigger-first description rewrite (2026-06-09-trigger-first-descriptions.md).

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review (flagged independently by the workflow-router, packaging, and consistency reviewers).
