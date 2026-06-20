---
id: 0113-2026-06-09-sequential-agent-fallback
title: 2026-06-09-sequential-agent-fallback
type: refactor
priority: P2
status: done
weight: light
created: 2026-06-09
updated: 2026-06-09
---

# 2026-06-09-sequential-agent-fallback

# Issue: Add a sequential fallback to parallel-agent instructions

## Summary

codebase-review and issue-review instruct only "use the Agent tool / spawn explorer agents" with no path for harnesses without subagent dispatch; implement and session-wrap-up share the pattern. One sentence per site fixes it.

## Problem Description

codebase-review:28,52 and issue-review:28 cover only Claude Code and Codex; on a harness without subagents (Gemini CLI, Copilot CLI, plain chat) the model is told to use a tool that does not exist — confirmed to have no fallback anywhere in either file. The same pattern in implement:144-167 and session-wrap-up:19-52 was judged lower risk because both official target harnesses support subagents, but the fix is identical and cheap since every agent prompt is already a self-contained brief. templates/AGENTS.md.template repeats the "(3 parallel agents)" claim.

## Acceptance Criteria

- [ ] codebase-review, issue-review, implement, and session-wrap-up each state: if the harness cannot spawn subagents, perform the reviews/explorations yourself sequentially, using each agent prompt as a checklist
- [ ] templates/AGENTS.md.template drops or qualifies the bare "(3 parallel agents)" claim

## Technical Context

### Affected Files

- skills/codebase-review/SKILL.md:28,52
- skills/issue-review/SKILL.md:28
- skills/implement/SKILL.md:144-167
- skills/session-wrap-up/SKILL.md:19-52
- templates/AGENTS.md.template

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review. Verifiers confirmed the gap for codebase-review and issue-review; they refuted high severity for implement and session-wrap-up (Codex supports subagents), so this issue treats all four as one consistency pass.

## Notes

> Migrated from issue `2026-06-09-sequential-agent-fallback.md`.
