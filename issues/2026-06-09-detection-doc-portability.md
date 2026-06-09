---
status: triaged
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: Detection-procedure links break in installed layouts; doc has two gaps

## Summary

Skills reference `../../docs/detecting-optional-skills.md`, but every documented install path ships only `skills/*`, so the link resolves to a nonexistent path and optional-dependency detection silently degrades on the portable and Codex installs the plugin targets.

## Problem Description

`bin/setup-project` (`install_skill_set`, lines 188-205) and the manual symlink loop in codex/INSTALL.md install per-skill directories only; `docs/` never ships. From an installed skill, `../../docs/` resolves to `.claude/docs/` or `.agents/docs/`, which never exists. Affected referencing skills: issue-review (lines 24, 47), triage (step 6), workflow-router (line 34), implement, new-track, session-wrap-up.

The doc itself has two gaps: it never says what to do when all three signals are negative (a weaker model may invoke speculatively, try to install the plugin, or stall), and it covers only Claude Code and Codex with no guidance for other harnesses.

## Acceptance Criteria

- [ ] Each detection reference inlines a one-line summary of the three signals so the doc is an enhancement, not required reading
- [ ] The doc gains a terminal state: "If no signal is positive, treat the skill as unavailable — use the calling skill's inline fallback; do not install or invoke speculatively"
- [ ] The doc gains one sentence covering harnesses that are neither Claude Code nor Codex
- [ ] Alternatively or additionally: setup-project ships docs/ alongside skills

## Technical Context

### Affected Files

- docs/detecting-optional-skills.md
- skills/issue-review/SKILL.md:24,47
- skills/triage/SKILL.md (step 6)
- skills/workflow-router/SKILL.md:34
- skills/implement/SKILL.md:70,105,147
- skills/new-track/SKILL.md
- skills/session-wrap-up/SKILL.md
- bin/setup-project:188-205

### Related Tests

### Similar Patterns

Suggested inline form: "Detect `brainstorming` (check, in order: the available-skills list for `superpowers:brainstorming` or `brainstorming`; `.claude/settings.json` enabledPlugins; `.claude/skills/` or `.agents/skills/` directories) — see docs/detecting-optional-skills.md for details."

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review (issue-review, triage, workflow-router, and templates-docs reviewers independently).
