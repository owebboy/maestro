---
status: reviewed
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

All 15 descriptions live on `SKILL.md:3` (verified). The 15 skills are: agents-md-sync, codebase-review, implement, issue-advance, issue-close, issue-review, manage, new-track, session-wrap-up, setup, status, triage, uat-create, uat-run, workflow-router.

Descriptions that bury the trigger / enumerate internal steps (rewrite these):

- skills/codebase-review/SKILL.md:3 — leads with "Performs a full codebase review using parallel review agents (security, performance, architecture, testing, data-integrity, UX), then parallel audit agents... Results go to issues/INBOX.md." Enumerates internal pipeline; trigger buried at end.
- skills/session-wrap-up/SKILL.md:3 — leads with "End-of-session wrap-up that reviews code quality, checks for untracked issues, updates CLAUDE.md/AGENTS.md... and commits." The "and commits" summary omits the body's rule to ignore pre-existing uncommitted changes — a shortcutting model commits work it should not. (Already partially edited in commit d7b6356, but still capability-first.)
- skills/new-track/SKILL.md:3 — leads with "Creates a new development track with specification and implementation plan. Wraps Superpowers brainstorming and planning..."; trigger second.
- skills/triage/SKILL.md:3 — leads with "Processes raw issue bullets from issues/INBOX.md into structured issue files with dedup checking, type classification..."; trigger second. (No trailing period.)
- skills/implement/SKILL.md:3 — already "Use when..."-first AND already carries the issue-advance contrast clause ("for a designed track from an issue, use issue-advance instead"), edited in commit b12ade8/d7b6356. Verify it still reads trigger-first after the pass; the contrast clause requirement is already satisfied here.
- skills/issue-advance/SKILL.md:3 — leads with "Converts a reviewed issue into a conductor track, creating the track from issue data and archiving the issue file."; trigger second. Overlaps implement on "ready" + "implement".
- skills/uat-run/SKILL.md:3 — leads with "Walks through a UAT checklist as an interactive proctor, runs validations, captures failures to issues/INBOX.md..."; trigger second. (No trailing period.)
- skills/agents-md-sync/SKILL.md:3 — leads with "Generates or updates an AGENTS.md file..."; trigger second.
- skills/setup/SKILL.md:3 — leads with "Initializes project with development context artifacts..."; trigger second.
- skills/uat-create/SKILL.md:3 — leads with "Generates a UAT checklist from completed conductor tracks..."; trigger second. (No trailing period.)
- skills/issue-review/SKILL.md:3 — leads with "Enriches a triaged issue file with technical context..."; trigger second. (No trailing period.)
- skills/workflow-router/SKILL.md:3 — leads with "Explicit routing helper for choosing the right Maestro workflow..."; trigger second. SEE Dependencies — workflow-router-invocation owns this file's description/frontmatter rewrite.

Wrong trigger verb (use "Use when..." not "Use for"/"Use to"):

- skills/manage/SKILL.md:3 — ends with "Use for track housekeeping." Needs "tracks only; for issues use issue-close" contrast clause (overlaps issue-close on "archive").
- skills/status/SKILL.md:3 — ends with "Use to get oriented at the start of a session or check progress."

Already trigger-shaped (light touch only, confirm wording):

- skills/issue-close/SKILL.md:3 — "Use when closing an issue without implementation" (no trailing period). Add "issues only; for tracks use manage" contrast clause (overlaps manage on "archive").

openai.yaml short_descriptions (15 at `skills/*/agents/openai.yaml:3`, NOT a single top-level `agents/openai.yaml` — the issue's original path was imprecise):

- These are ALREADY terse single sentences and do NOT echo the old workflow-summarizing phrasing (e.g. codebase-review: "Review and audit a codebase with agents."; session-wrap-up: "Wrap up session work and context."). They were cleaned up in commits 33cf87a / afba736. So Acceptance Criterion 3 ("stay consistent with the new descriptions") is mostly a read-through to confirm no drift after the SKILL.md rewrites — not a bulk rewrite. Each openai.yaml also contains `default_prompt` and a `policy` block; leave those to the policy-blocks issue (see Dependencies).

### Related Tests

This repo has no automated test suite (Markdown skills + Bash hooks). Validation is by inspection and Sonnet-based skill verification:

- After the rewrite, re-run the adversarial selection check that found the bug: confirm a Sonnet-tier model, given only the new descriptions, no longer treats a description as an execution shortcut (especially session-wrap-up not committing pre-existing changes, codebase-review not skipping the body).
- Confirm the implement/issue-advance and manage/issue-close pairs disambiguate: a model asked to "archive" should pick manage for tracks and issue-close for issues; a model with only a reviewed issue should route to issue-advance, not implement.
- Markdown/YAML sanity: descriptions stay on SKILL.md:3, frontmatter still parses, openai.yaml still valid YAML.

### Similar Patterns

- Example rewrites: session-wrap-up → "Use when a Claude Code or Codex session is ending, the user is wrapping up, or says they're done for now." codebase-review → "Use when the user asks for a comprehensive codebase health check, full audit, or whole-repo security/performance/architecture review. Not for single-diff or PR review."
- In-repo model already in the right shape: skills/implement/SKILL.md:3 is trigger-first with a contrast clause — copy its pattern ("Use when ... <trigger>; <contrast: for X use Y instead>.") for issue-advance, manage, and issue-close.
- The terse openai.yaml short_descriptions (skills/*/agents/openai.yaml:3) are a good consistency reference for keeping each skill's one-line intent stable across both harnesses.
- Related commit: d7b6356 ("Harden skills...") is the most recent cross-LLM-review pass and touched many of these SKILL.md files — rebase line/content expectations on current HEAD, not the filing-time text.

## Dependencies

Two sibling issues edit the SAME description / openai.yaml files. Coordinate so a file is not rewritten twice (sequence: do this trigger-first pass FIRST so the others reconcile against the final wording, OR land them together):

- 2026-06-09-workflow-router-invocation.md (status: reviewed) — owns the rewrite of skills/workflow-router/SKILL.md:3 (description + frontmatter `user-invocable`) and skills/workflow-router/agents/openai.yaml. It already says "Coordinate with the trigger-first description rewrite." Defer workflow-router's description to that issue (or make the trigger-first edit there).
- 2026-06-09-openai-yaml-policy-blocks.md (status: triaged) — edits skills/*/agents/openai.yaml, including the `short_description` for issue-review and session-wrap-up plus `policy` blocks in new-track, status, triage, uat-create, setup. This issue's Criterion 3 (openai.yaml consistency) overlaps; leave `policy` blocks and the two flagged short_descriptions to that issue to avoid double edits.

## Out of Scope

- Rewriting the SKILL.md body content. This issue changes only line 3 (the `description:` frontmatter) and openai.yaml short_descriptions for consistency.
- The openai.yaml `policy` / `allow_implicit_invocation` blocks (owned by openai-yaml-policy-blocks).

## Notes

- Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification. Highest-leverage cross-LLM change in the review.
- Decision for the human (do not pre-decide): how many of the 15 descriptions should be FULLY rewritten vs. lightly polished. The 15 are at different starting points after recent commits — implement is already trigger-first with its contrast clause; issue-close is trigger-shaped but missing its contrast clause; the rest are still capability-first. Acceptance Criterion 1 ("All 15 start with 'Use when...'") is taken at face value, but if a reviewer wants to leave an already-good description like implement untouched, flag it during implementation.
- The openai.yaml short_descriptions are already terse and non-workflow-summarizing (cleaned in 33cf87a / afba736), so Criterion 3 is largely a verification step, not a bulk rewrite — see Affected Files.
