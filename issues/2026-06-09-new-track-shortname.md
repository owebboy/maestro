---
status: reviewed
type: bug
priority: P3
filed: 2026-06-09
---

# Issue: new-track never defines how to derive {shortname} for track IDs

## Summary

Track IDs use `{shortname}_{YYYYMMDD}` but the skill never specifies how to derive the shortname from the track name, so two models produce two naming schemes and cross-references break.

## Problem Description

`skills/new-track/SKILL.md:53` introduces `{shortname}` with no derivation rule — no casing, separator, word-count, or length constraint. Examples elsewhere in the repo suggest lowercase hyphenated (`nav-fix_20260403`, `auth_20260401`, `dashboard_20260402`) but nothing normative says so. Downstream skills (implement, status, manage) match tracks by ID, so inconsistent derivation creates orphans. `skills/issue-advance/SKILL.md` delegates ID creation to new-track, so new-track Step 3 is the single source of truth — fixing it there covers both entry paths. Also fold in: the completion message (now `skills/new-track/SKILL.md:146`, drifted from line 145) hardcodes "(from Superpowers)" even when the inline fallback at SKILL.md:106-109 produced the plan.

## Acceptance Criteria

- [ ] A normative derivation rule (e.g., "2-3 lowercase hyphenated words from the track name, max 20 chars") with one example
- [ ] Completion message reflects which engine actually produced the plan

## Technical Context

### Affected Files

- `skills/new-track/SKILL.md:53` — Step 3 introduces `{shortname}_{YYYYMMDD}` with example `user-auth_20260403`; the normative derivation rule needs to be added immediately after this line (alongside the existing date and uniqueness sub-bullets at lines 54-55).
- `skills/new-track/SKILL.md:146` — Completion message file list hardcodes `plan.md — implementation plan (from Superpowers)`; must reflect whichever engine actually produced the plan (writing-plans skill vs. inline fallback).
- `skills/new-track/SKILL.md:106-109` — The inline plan fallback ("If Superpowers is not installed, generate a phased plan inline") is the branch that makes the hardcoded "(from Superpowers)" label wrong.
- `skills/new-track/SKILL.md:134` — Track ID conflict handling already shows a hyphenated suffix example (`user-auth-2_20260403`); any new derivation rule should stay consistent with this format.
- `skills/manage/SKILL.md:60` (consumer, not edited) — Validates the `{shortname}_{YYYYMMDD}` format on rename; a normative rule keeps generated IDs valid here.
- `skills/issue-advance/SKILL.md` (consumer, not edited) — Calls new-track to create the track; inherits whatever rule new-track Step 3 defines, so no separate change is needed.

### Related Tests

No automated test suite (Markdown skills + Bash). Validate manually:
- Run `/new-track` (or `$new-track` in Codex) for a few track names and confirm the generated `{shortname}` consistently follows the new rule and stays unique against `conductor/tracks.md`.
- Run `/new-track` once with the writing-plans/Superpowers path and once with the inline fallback (Superpowers absent), and confirm the completion message labels the plan source correctly in each case.
- Sonnet skill verification (per repo convention: Maestro skill verification subagents run on Sonnet, the skills' primary consumer).

### Similar Patterns

- In-repo track-ID examples that ground a lowercase-hyphenated convention: `skills/status/SKILL.md:45-47` (`auth_20260401`, `dashboard_20260402`, `nav-fix_20260403`), `skills/implement/SKILL.md:46,49` (`auth_20260403`, `nav-fix_20260402`), and the inline example at `skills/new-track/SKILL.md:53` (`user-auth_20260403`). All are lowercase, hyphen-separated, 1-3 words.
- Format validation already enforced downstream at `skills/manage/SKILL.md:60` (`{shortname}_{YYYYMMDD}`) — the new rule should produce IDs that pass this check.
- Existing "run X by hand" sub-bullet pattern for normative instructions in this skill (e.g., the date-derivation bullets at SKILL.md:54, 57, 115, 128) is the model for phrasing/placing the derivation rule.
- Related commit `d7b6356` ("Harden skills: ... edge-case guards") shows the recent hardening style this fix continues.

## Dependencies

None. `skills/issue-advance/SKILL.md` consumes new-track's ID generation but requires no coordinated edit (it delegates to Step 3).

## Out of Scope

- Retroactively renaming or migrating existing track IDs.
- Changing the `{shortname}_{YYYYMMDD}` ID structure itself (only specifying how `{shortname}` is derived).
- Editing downstream consumers (`manage`, `status`, `implement`, `issue-advance`) — they already match by full ID and need no change.

## Notes

Found by the 2026-06-09 cross-LLM review.

Open decision for the human (do not pre-decide): the exact derivation rule wording is a judgment call. The Acceptance Criteria proposes "2-3 lowercase hyphenated words from the track name, max 20 chars" as an example; in-repo precedent supports lowercase-hyphenated but also includes 1-word IDs (`auth_…`), so the implementer should confirm the final min/max word count and character cap with the human before locking it in.
