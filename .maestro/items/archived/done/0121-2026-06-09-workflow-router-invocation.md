---
id: 0121-2026-06-09-workflow-router-invocation
title: 2026-06-09-workflow-router-invocation
type: bug
priority: P2
status: done
weight: light
created: 2026-06-09
updated: 2026-06-09
---

# 2026-06-09-workflow-router-invocation

# Issue: workflow-router invocation policy is inverted on both platforms

## Summary

`user-invocable: false` kills the "user invokes directly" trigger in Claude Code while `allow_implicit_invocation: false` kills the "user asks which workflow" trigger in Codex — each platform honors only half the description, and README, INSTALL.md, and the frontmatter each tell a different story.

## Problem Description

The description names two triggers: "the user asks which Maestro workflow to use" and "invokes the router directly". In Claude Code, `user-invocable: false` (SKILL.md:4) removes `/workflow-router`, so direct invocation is impossible there. In Codex, `allow_implicit_invocation: false` (openai.yaml:7) means the model never loads the skill when the user merely asks which workflow to use. README:150 says "Auto in Claude, explicit `$workflow-router` in Codex"; INSTALL.md:93 calls it "Explicit-only helper". This is a zero-risk, read-only advisory skill, so implicit invocation carries no danger.

## Acceptance Criteria

- [ ] `allow_implicit_invocation: true` in agents/openai.yaml (or a deliberate decision documented otherwise) (resolved: set to TRUE; `user-invocable: false` to be removed)
- [ ] Description triggers match what each platform actually permits
- [ ] README:150, codex/INSTALL.md:93, and the skill frontmatter tell the same story

## Technical Context

### Affected Files

- skills/workflow-router/SKILL.md:3 — description names two triggers: "the user asks which Maestro workflow to use" and "invokes the router directly".
- skills/workflow-router/SKILL.md:4 — `user-invocable: false`; this is the ONLY skill in the repo with this flag, so it blocks `/workflow-router` direct invocation in Claude Code — contradicting the "invokes the router directly" trigger on line 3.
- skills/workflow-router/agents/openai.yaml:7 — `allow_implicit_invocation: false`; in Codex the skill never loads when the user merely "asks which workflow to use", killing the other trigger.
- skills/workflow-router/agents/openai.yaml:4 — `default_prompt` frames the skill as `$workflow-router` explicit-only, reinforcing the Codex explicit-only stance.
- README.md:152 — "Auto in Claude, explicit `$workflow-router` in Codex" (note: line moved from 150 to 152 since filing); the "Auto in Claude" claim itself sits oddly with `user-invocable: false`.
- codex/INSTALL.md:93 — "Explicit-only helper; Codex ignores Claude auto-routing frontmatter".

### Related Tests

No automated test suite (Markdown + Bash repo). Validate manually:
- Claude Code: after the change, confirm `/workflow-router` appears/works as intended given the chosen `user-invocable` value, and that model-implicit activation on the two triggers still fires.
- Codex: confirm the skill loads on the "which workflow?" trigger once `allow_implicit_invocation` is set as decided.
- Sonnet skill verification of workflow-router, since Sonnet is the skills' primary consumer (see MEMORY.md "Verify skills with Sonnet").
- Grep audit: the three doc statements (SKILL.md description, README.md:152, codex/INSTALL.md:93) must agree after the edit.

### Similar Patterns

- Invocation-policy convention across the bundle: `grep -rn allow_implicit_invocation skills/*/agents/openai.yaml` — 10 skills set `false`; workflow-router is unusual only in ALSO carrying `user-invocable: false` (the sole skill that does).
- Sibling issue 2026-06-09-openai-yaml-policy-blocks.md defines the intended plugin-wide policy convention (explicit-only for file-writing skills; advisory/read-only skills may allow implicit). workflow-router is zero-risk read-only advisory, so it should err toward implicit — the opposite of the file-writing skills.
- skills/agents-md-sync/SKILL.md:32 documents that Codex strips `user-invocable` and other Claude-only frontmatter — useful context for why the two platforms diverge here.
- Related commit d7b6356 "Harden skills" recently touched these skill files (hence stale line numbers); afba736 "Make Maestro first-class for Codex" introduced the openai.yaml policy blocks.

## Dependencies

Coordinate with the trigger-first description rewrite (2026-06-09-trigger-first-descriptions.md) — that issue rewrites all 15 descriptions including this one at SKILL.md:3, and updates openai.yaml short_descriptions. Both issues edit skills/workflow-router/SKILL.md:3 and the same openai.yaml; sequence them so the description and the invocation policy land together and the triggers match what each platform actually permits.

Loosely related: 2026-06-09-openai-yaml-policy-blocks.md establishes the explicit-vs-implicit policy convention this issue's openai.yaml change should follow.

## Out of Scope

## Notes

**Resolution (2026-06-10):** Made the router fully invocable on both platforms — dropped `user-invocable: false` from `workflow-router/SKILL.md` and set `allow_implicit_invocation: true` in its `agents/openai.yaml`. Reconciled the description, `README.md`, and `codex/INSTALL.md` to state it is both auto/implicit and directly invocable.

Found by the 2026-06-09 cross-LLM review (flagged independently by the workflow-router, packaging, and consistency reviewers).

DECISION (human): Two related invocation-policy choices must be made and then reflected consistently across the description, README, and INSTALL:
1. Claude Code — keep `user-invocable: false` (model-implicit only, no `/workflow-router` slash command) or drop it to allow direct invocation? The line-3 description promises "invokes the router directly", which only holds if the flag is dropped.
2. Codex — flip `allow_implicit_invocation` to `true` (so "asks which workflow?" loads it) or keep it explicit-only via `$workflow-router`? AC#1 leans toward `true` for this zero-risk advisory skill but explicitly allows a documented decision otherwise.
Whichever way each is decided, README:152 and codex/INSTALL.md:93 must be rewritten to match — they currently disagree with each other and with the frontmatter.

**Decision (approved 2026-06-09):** APPROVED: make the router fully invocable on both platforms (zero-risk read-only advisory) — DROP `user-invocable: false` in workflow-router/SKILL.md AND set `allow_implicit_invocation: true` in its agents/openai.yaml. Reconcile README:152, codex/INSTALL.md:93, and the frontmatter to consistently state it is both auto/implicit AND directly invocable. Coordinate with trigger-first-descriptions (shared description) and openai-yaml-policy-blocks (sets this skill's policy value to true).

## Notes

> Migrated from issue `2026-06-09-workflow-router-invocation.md`.
