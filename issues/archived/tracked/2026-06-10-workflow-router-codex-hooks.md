---
status: tracked
type: bug
priority: P3
filed: 2026-06-10
advanced-to: cleanup-fixes_20260610
---

# Issue: workflow-router stale "Codex 5 experimental events" claim

## Summary

`skills/workflow-router/SKILL.md:37` still calls Codex hooks "5 experimental events" — stale since the codex-hook-mechanism fix established that Codex hooks are on by default.

## Problem Description

Line 37 reads "Claude supports 26 lifecycle events; Codex has 5 experimental events." Two problems:

1. **"experimental" is stale.** The codex-hook-mechanism fix established that Codex hooks are on by default (disable with `[features] hooks = false`) and use the same nested schema as Claude (README.md:166).
2. **The "26 lifecycle events" Claude count is unsourced and conflicts with the repo's own framing.** `skills/agents-md-sync/SKILL.md:31` enumerates 9 hook events (the 5 Codex shares — SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop — plus 4 Claude-only: SessionEnd, SubagentStop, PreCompact, Notification).

Update line 37 to drop "experimental", reconcile the Claude count with `agents-md-sync` (or drop the bare number), and align the Codex framing with README, INSTALL, and agents-md-sync.

## Acceptance Criteria

- [ ] SKILL.md:37 no longer describes Codex hooks as "experimental"
- [ ] The Codex hook framing matches README.md:166 (on by default, same nested schema as Claude)
- [ ] The Claude lifecycle-event count is reconciled with `agents-md-sync:31` (9 enumerated events) or replaced with the canonical framing rather than a bare "26"
- [ ] Wording is consistent across workflow-router, README, INSTALL, and agents-md-sync

## Technical Context

### Affected Files

- `skills/workflow-router/SKILL.md:37` — the stale line (the fix site)
- `README.md:166` — canonical framing: "on by default; disable with `[features] hooks = false`...same nested schema as Claude" (no change needed)
- `codex/INSTALL.md:113` — already consistent with README; also lists the registration mechanism (no change needed)
- `skills/agents-md-sync/SKILL.md:31` — already consistent; enumerates the 5 Codex events and the 4 Claude-only events (reference for the corrected count)

### Related Tests

None. No doc-consistency validator, markdown linter, or CI exists, so the stale claim was found by manual review and nothing would catch a regression. (`bin/hooks/validate-issue-frontmatter.sh` covers only issue frontmatter.)

### Similar Patterns

- The codex-hook-mechanism fix landed in commit `05e8101` ("Implement Codex accuracy batch: hook registration, config key, install fixes"), which corrected README and `codex/INSTALL.md` from "experimental (`codex_hooks = true`)" to "on by default". `workflow-router/SKILL.md:37` was missed in that sweep.
- `issues/archived/implemented/2026-06-09-codex-hook-mechanism.md` — the resolved issue that established the canonical framing (verified against Codex docs).

## Dependencies

None. This is the last known stale copy of the "experimental" framing.

## Out of Scope

## Notes

Pure documentation fix — single line. Confirm whether to keep an explicit event count (mirroring agents-md-sync) or drop the number entirely.
