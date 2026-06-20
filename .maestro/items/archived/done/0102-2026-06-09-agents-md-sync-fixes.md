---
id: 0102-2026-06-09-agents-md-sync-fixes
title: 2026-06-09-agents-md-sync-fixes
type: bug
priority: P2
status: done
weight: light
created: 2026-06-09
updated: 2026-06-09
---

# 2026-06-09-agents-md-sync-fixes

# Issue: agents-md-sync relays a wrong Codex config snippet and lacks edge guards

## Summary

The skill tells users to add `project_doc_fallback_filenames` under a `[project]` table in a project-local `.codex/config.toml`; per Codex docs it is a top-level key in `~/.codex/config.toml`, so the advice silently does nothing. The skill also lacks a missing-CLAUDE.md guard and can drop AGENTS.md-only content on regeneration.

## Problem Description

Three defects: (1) SKILL.md:67-72 and codex/INSTALL.md:70-74 both show the wrong file and wrong TOML table — under `[project]` the key becomes `project.project_doc_fallback_filenames` and Codex ignores it without error. (2) Step 1 assumes CLAUDE.md exists; with none present, a model may fabricate AGENTS.md content. Add: "If no CLAUDE.md exists, stop and tell the user there is nothing to sync; offer /setup or drafting from scratch. Do not invent content." (3) Steps 5-6 regenerate from CLAUDE.md, so Codex-specific sections that exist only in AGENTS.md get proposed for deletion with only the diff as a safeguard — merge instead of regenerating, and call out anything that would be removed. Minor: line 30 cites hook events ("FileChanged", "TaskCompleted") that do not exist in Claude Code.

## Acceptance Criteria

- [ ] Config snippet shows the top-level key in `~/.codex/config.toml`, verified against current Codex docs; INSTALL.md matches (verified 2026-06-09 — satisfied; write the top-level `~/.codex/config.toml` form: `project_doc_fallback_filenames = ["CLAUDE.md"]`)
- [ ] Missing/empty CLAUDE.md case has an explicit stop-and-tell-user path
- [ ] Step 5 preserves AGENTS.md-only sections and flags removals explicitly in the diff
- [ ] Hook event names corrected or dropped

## Technical Context

### Affected Files

(line numbers verified against current HEAD d7b6356; file was recently hardened by that commit)

- `skills/agents-md-sync/SKILL.md:13-16` — Step 1 "Scan for instruction files": reads root/subdir `CLAUDE.md` and `CLAUDE.local.md`; has NO guard for the missing/empty-CLAUDE.md case. Defect #2 lands here (add stop-and-tell-user path).
- `skills/agents-md-sync/SKILL.md:30` — Hook-events line. Current text already lists Codex's 5 events but cites `FileChanged`, `SessionEnd`, `TaskCompleted` as Claude events. `SessionEnd` is a real Claude event; `FileChanged` and `TaskCompleted` are NOT real Claude Code hook events (the canonical set is SessionStart, SessionEnd, PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, PreCompact, Notification). Defect #4 (minor): correct or drop the fabricated names.
- `skills/agents-md-sync/SKILL.md:61-66` — Steps 5-6 "Diff against existing AGENTS.md" then "Write AGENTS.md". Regenerates from CLAUDE.md with only the diff as a safeguard; AGENTS.md-only (Codex-specific) sections get proposed for deletion. Defect #3 lands here (merge instead of regenerate; flag removals explicitly).
- `skills/agents-md-sync/SKILL.md:67-72` — Step 7 "Remind user about Codex config". Current snippet (lines 69-71) recommends `.codex/config.toml` with `[project]` / `project_doc_fallback_filenames = ["CLAUDE.md"]`. Defect #1 lands here (wrong file + wrong TOML table per issue Summary — pending Codex-docs verification, see Notes).
- `codex/INSTALL.md:67-74` — "Configuration" section TOML block. Lines 72-73 repeat the same `[project]` / `project_doc_fallback_filenames` snippet; must be kept in sync with the SKILL.md fix. (The issue cited 70-74; current block is 67-74, with the `[project]` table at 72-73.)

### Related Tests

This repo has NO automated test suite (Markdown skills + Bash scripts). Validate the change by:
- Running the `agents-md-sync` skill manually against a sample repo: one WITH a `CLAUDE.md` (confirm a correct AGENTS.md is produced and the corrected config snippet is shown verbatim), and one WITHOUT a `CLAUDE.md` (confirm the new stop-and-tell-user path fires and no content is fabricated).
- Confirm a re-run over a repo whose AGENTS.md already contains a Codex-only section preserves that section and flags any proposed removal in the diff (defect #3).
- Manually paste the corrected TOML into a Codex `config.toml` and confirm the key is read at the location the docs specify (defect #1 verification step).
- Sonnet skill verification (per MEMORY.md, Maestro skill verification subagents run on Sonnet, the skills' primary consumer).

### Similar Patterns

- Edge-case guard models to copy: HEAD commit `d7b6356` "Harden skills: ... edge-case guards" added stop-and-tell-user guards across other skills — follow that same pattern for the missing-CLAUDE.md guard (defect #2).
- `codex/INSTALL.md:101-108` ("Differences from Claude Code") already states the Codex hook-event facts (5 events, `codex_hooks = true`) and the auto-memory/permissions translations the skill paraphrases — use it as the source of truth when correcting SKILL.md:30 and reconcile any drift.
- Sibling cluster issues `issues/2026-06-09-codex-hook-mechanism.md` and `issues/2026-06-09-codex-install-fixes.md` touch the same Codex-config/INSTALL.md surface; coordinate edits to avoid conflicting rewrites of the Configuration section.

## Dependencies

Part of the Codex-accuracy cluster. Coordinate with:
- `issues/2026-06-09-codex-install-fixes.md` — also edits `codex/INSTALL.md` (the manual-install loop at 50-61 and the false `.mcp.json` claim at line ~13/105). Both touch INSTALL.md; sequence to avoid line-number churn.
- `issues/2026-06-09-codex-hook-mechanism.md` — overlaps on Codex hook accuracy; defect #4 here (hook-event names) should stay consistent with whatever that issue concludes about Codex hook execution.
- Defect #1 is BLOCKED on the external Codex-docs research below — do not close the config-snippet AC until the correct key + file location are confirmed.

## Out of Scope

## Notes

**Resolution (2026-06-09):** All four defects fixed. Step 7 config snippet now shows the top-level `project_doc_fallback_filenames` key in the global `~/.codex/config.toml` (kept identical in `codex/INSTALL.md` and `bin/setup-project`'s tip); added a missing-CLAUDE.md stop-and-tell-user guard to Step 1; Steps 5–6 now merge (preserve AGENTS.md-only sections, explicitly flag removals) instead of regenerating; corrected the fabricated Claude hook events (`FileChanged`/`TaskCompleted`) on line 30.

Found by the 2026-06-09 cross-LLM review.

### EXTERNAL RESEARCH DEPENDENCY (defect #1 — must verify before fixing)

The issue Summary asserts the correct form is a TOP-LEVEL `project_doc_fallback_filenames` key in `~/.codex/config.toml` (user-scoped), and that placing it under a `[project]` table makes it `project.project_doc_fallback_filenames`, which Codex ignores. This MUST be settled against CURRENT Codex documentation before editing — do not guess the key name, the TOML table, or the file location. Specifically confirm: (a) the exact key name (`project_doc_fallback_filenames` vs any rename), (b) whether it is a top-level key or belongs under a table, and (c) whether it lives in `~/.codex/config.toml` (global) or a project-local `.codex/config.toml`. The same verified snippet must then be applied identically to both `skills/agents-md-sync/SKILL.md:69-71` and `codex/INSTALL.md:72-73`.

**Research (verified 2026-06-09):** Verified against current Codex docs (https://developers.openai.com/codex/guides/agents-md): the correct setting is the TOP-LEVEL key `project_doc_fallback_filenames` in the GLOBAL `~/.codex/config.toml` — NOT under a `[project]` table and NOT a project-local `.codex/config.toml`. Example: `project_doc_fallback_filenames = ["CLAUDE.md"]`. It is a FALLBACK consulted only when AGENTS.md is ABSENT in a directory (lookup order: AGENTS.override.md -> AGENTS.md -> fallbacks); if AGENTS.md exists it wins and CLAUDE.md is ignored. Defect #1 CONFIRMED: SKILL.md and codex/INSTALL.md must show the top-level key in ~/.codex/config.toml. Research dependency RESOLVED — issue is now implementable.

## Notes

> Migrated from issue `2026-06-09-agents-md-sync-fixes.md`.
