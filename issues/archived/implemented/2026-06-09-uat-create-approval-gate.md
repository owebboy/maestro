---
status: implemented
type: bug
priority: P2
filed: 2026-06-09
implemented: 2026-06-09
---

# Issue: uat-create writes the checklist before its own approval gate

## Summary

Step 5 writes `conductor/UAT-YYYY-MM-DD.md` to disk, but step 6 says to present the checklist "for review before saving" — the gate sits after the write it is meant to guard.

## Problem Description

A model following the numbered steps literally saves the file in step 5, making step 6's "before saving" impossible; a careful model stalls on the contradiction. Either way the intended approval gate is defeated or ambiguous on every platform. Reorder to draft → present and wait for approval → write.

## Acceptance Criteria

- [ ] Step 5 drafts the checklist without writing the file
- [ ] Step 6 presents the draft, waits for explicit approval, then writes the file
- [ ] The wait is phrased platform-neutrally (AskUserQuestion if available, otherwise ask in plain text and stop)

## Technical Context

### Affected Files

- `skills/uat-create/SKILL.md:39-46` — Step 5 "Write the checklist" writes `conductor/UAT-YYYY-MM-DD.md` to disk (line numbers shifted from the cited 39-47 after commit d7b6356). This is the write that must move to AFTER approval.
- `skills/uat-create/SKILL.md:47` — Step 6 "Present the generated checklist for review before saving" — the gate that currently sits after the write. Reword to present the draft, wait for explicit approval, then write.
- `skills/uat-create/SKILL.md:49-85` — "Format Reference" block describes the file layout; the step-5 draft should produce this same content in-memory before writing, so no format change is needed, only sequencing.

### Related Tests

No automated test suite in this repo (Markdown skills + Bash). Validate by:
- Running the `/uat-create` (maestro:uat-create) skill manually against a completed track and confirming the model drafts the checklist, pauses for explicit approval, and only writes `conductor/UAT-YYYY-MM-DD.md` after approval.
- Sonnet skill verification (per repo convention: Maestro skill verification subagents run on Sonnet, the skills' primary consumer) — confirm the reordered steps read unambiguously and the approval gate precedes the write.

### Similar Patterns

- `skills/new-track/SKILL.md:76` — "Show spec to user for review. Wait for approval before proceeding." — the canonical draft -> approve -> proceed sequencing to mirror.
- `skills/implement/SKILL.md:199-219` — "Report and Wait for Approval" with a numbered plain-text prompt and "CRITICAL: Never proceed ... without user approval." — model for phrasing an explicit, platform-neutral wait.
- `skills/uat-run/SKILL.md:106` — "wait for user input before advancing" — another in-repo wait-gate phrasing.
- Commit d7b6356 ("Harden skills...") is the recent edit that shifted these line numbers and added the `date +%Y-%m-%d` instruction now embedded in step 5.

## Dependencies

None. Self-contained edit to one skill file; no cross-issue coordination required.

## Out of Scope

## Notes

**Resolution (2026-06-09):** Reordered uat-create Steps 5–6 — Step 5 drafts the checklist in memory (no write); Step 6 presents the draft, waits for explicit approval (`AskUserQuestion` or plain-text stop), then writes `conductor/UAT-YYYY-MM-DD.md`.

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification.

This repo does not yet use the `AskUserQuestion` tool anywhere (grep returns no hits); every existing approval gate uses plain-text numbered prompts (see Similar Patterns). The AC's platform-neutral phrasing ("AskUserQuestion if available, otherwise ask in plain text and stop") is therefore satisfied by following the existing plain-text convention while permitting AskUserQuestion where the harness offers it. No unresolved decision or external research needed.
