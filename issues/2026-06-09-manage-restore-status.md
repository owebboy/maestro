---
status: reviewed
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: manage restore corrupts status for non-completed tracks; --list has no body

## Summary

Restore unconditionally sets `status: "completed"`, so restoring a track archived as abandoned or superseded marks half-finished work complete. Separately, `--list` appears in the modes table and menu but has no body section.

## Problem Description

Archive explicitly allows archiving in-progress tracks with reasons superseded/abandoned (SKILL.md:31), but Restore step 4 (SKILL.md:45) writes `archived: false`, `status: "completed"` regardless. A model follows this literally and corrupts metadata on every platform. Fix: record `status_at_archive` during Archive (SKILL.md:34, alongside `archived_at`/`archive_reason`) and restore that value, asking the user if absent. The `--list` mode (modes table SKILL.md:21, interactive menu SKILL.md:80, openai.yaml:4) is declared in three places, but no section defines what it outputs — models improvise.

Note: the canonical metadata.json `status` value for a finished track is `"complete"` (implement/SKILL.md:245, setup/SKILL.md:78) — Restore's hardcoded `"completed"` is also inconsistent with the rest of the plugin, so the restored value should match the recorded `status_at_archive` rather than any hardcoded string.

## Acceptance Criteria

- [ ] Archive records the pre-archive status (e.g., `status_at_archive` in metadata.json)
- [ ] Restore reinstates that status, asking the user when it is absent
- [ ] A `--list` section defines its output format

## Technical Context

### Affected Files

- `skills/manage/SKILL.md:34` — Archive step 5 writes metadata.json (`archived: true`, `archived_at`, `archive_reason`); add `status_at_archive` capture of the pre-archive status here.
- `skills/manage/SKILL.md:45` — Restore step 4: the bug. Hardcodes `status: "completed"`; must reinstate `status_at_archive` (asking the user if absent).
- `skills/manage/SKILL.md:30-31` — Archive steps 1-2 confirm in-progress/superseded/abandoned archiving is allowed, which is exactly why a blanket "completed" on restore is wrong.
- `skills/manage/SKILL.md:21` — Modes table declares `--list`; no body section defines its output.
- `skills/manage/SKILL.md:75-89` — Interactive Mode block; menu item 1 (line 80) references "same as --list" but List has no section to point at. Good place to anchor a new `## List` section.
- `skills/manage/agents/openai.yaml:4` — Codex `default_prompt` advertises restore/list; behavior must match the fixed SKILL.md (no code change strictly required, but verify wording stays accurate).

### Related Tests

No automated test suite (Markdown + Bash plugin). Validate by:
- Manually exercising the `manage` skill in a scratch conductor/ with a track archived as `abandoned` and one as `superseded`, then restoring each — confirm `status` returns to the pre-archive value, not `completed`, and that the user is prompted when `status_at_archive` is missing (e.g. an older archive predating this change).
- Sonnet skill verification (per MEMORY: Maestro verification subagents run on Sonnet, the skills' primary consumer) — confirm a fresh model reads Restore and reinstates the recorded status rather than improvising.
- Confirm the new `## List` section produces a deterministic, reproducible output format across reads.

### Similar Patterns

- `skills/implement/SKILL.md:69,245` and `setup/SKILL.md:78` — canonical metadata.json `status` writes (`in_progress`, `complete`); copy their value vocabulary so `status_at_archive`/restore stays consistent.
- `skills/manage/SKILL.md:34` — the `archived_at`/`archive_reason` write is the exact pattern to extend with `status_at_archive` (same step, same metadata.json edit).
- Other mode sections in the same file (`## Archive`, `## Restore`, `## Delete`, `## Cleanup`) are the structural model for the new `## List` section: numbered/structured steps under an H2, referenced by the modes table and interactive menu.
- Commit `d7b6356` ("Harden skills: date instruction, dual-harness refs, sequential fallback, edge-case guards") is the most recent edit to this file and the source of the line-number drift; it added the `date -u` timestamp guidance now on lines 34 and 71.

## Dependencies

None. Self-contained within the `manage` skill. Part of the same 2026-06-09 cross-LLM review batch as other issue files in `issues/`, but no shared code or ordering constraint.

## Out of Scope

- Reworking the metadata.json status vocabulary plugin-wide (the `complete` vs `completed` inconsistency at SKILL.md:45 vs implement/SKILL.md:245). Restore should match the recorded `status_at_archive`; a broader status-value normalization is a separate concern.
- Bulk restore (only `--archive --bulk` exists today; Restore is single-track).

## Notes

Found by the 2026-06-09 cross-LLM review.

DECISION FOR HUMAN (does not block the fix): when `status_at_archive` is absent on an older archive, the issue specifies "ask the user." Confirm the intended fallback prompt — e.g. offer the user a choice among the known status values (`pending` / `in_progress` / `complete`) rather than free text, so the restored metadata stays schema-valid.
