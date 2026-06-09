---
status: triaged
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: agents-md-sync relays a wrong Codex config snippet and lacks edge guards

## Summary

The skill tells users to add `project_doc_fallback_filenames` under a `[project]` table in a project-local `.codex/config.toml`; per Codex docs it is a top-level key in `~/.codex/config.toml`, so the advice silently does nothing. The skill also lacks a missing-CLAUDE.md guard and can drop AGENTS.md-only content on regeneration.

## Problem Description

Three defects: (1) SKILL.md:67-72 and codex/INSTALL.md:70-74 both show the wrong file and wrong TOML table — under `[project]` the key becomes `project.project_doc_fallback_filenames` and Codex ignores it without error. (2) Step 1 assumes CLAUDE.md exists; with none present, a model may fabricate AGENTS.md content. Add: "If no CLAUDE.md exists, stop and tell the user there is nothing to sync; offer /setup or drafting from scratch. Do not invent content." (3) Steps 5-6 regenerate from CLAUDE.md, so Codex-specific sections that exist only in AGENTS.md get proposed for deletion with only the diff as a safeguard — merge instead of regenerating, and call out anything that would be removed. Minor: line 30 cites hook events ("FileChanged", "TaskCompleted") that do not exist in Claude Code.

## Acceptance Criteria

- [ ] Config snippet shows the top-level key in `~/.codex/config.toml`, verified against current Codex docs; INSTALL.md matches
- [ ] Missing/empty CLAUDE.md case has an explicit stop-and-tell-user path
- [ ] Step 5 preserves AGENTS.md-only sections and flags removals explicitly in the diff
- [ ] Hook event names corrected or dropped

## Technical Context

### Affected Files

- skills/agents-md-sync/SKILL.md:13-16,29-31,61-72
- codex/INSTALL.md:70-74

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
