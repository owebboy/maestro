# Design: Maestro cleanup fixes

**Track ID:** cleanup-fixes_20260610
**Type:** chore
**Created:** 2026-06-10
**Status:** Approved

## Overview

Three small, independent documentation/scaffold fixes in the Maestro plugin. Four edits across three files. All low-risk; verification is the repo's standard gate (`bash -n` + manifest JSON checks). The fixes share no state and could land in any order; they are grouped into one track for efficiency.

## Edits

### Issue 1 — `bin/setup-project`: add the `implemented/` scaffold bucket

`ensure_issues_scaffold` (lines 256–279) creates four archive buckets but omits `implemented/`. Insert one line, in canonical order `{tracked,implemented,deferred,wont-fix,duplicate}`, using the existing `ensure_directory` helper (244–254).

**Before (266–269):**
```bash
  ensure_directory "$issues_dir/archived/tracked" "issues/archived/tracked/"
  ensure_directory "$issues_dir/archived/deferred" "issues/archived/deferred/"
  ensure_directory "$issues_dir/archived/wont-fix" "issues/archived/wont-fix/"
  ensure_directory "$issues_dir/archived/duplicate" "issues/archived/duplicate/"
```

**After:**
```bash
  ensure_directory "$issues_dir/archived/tracked" "issues/archived/tracked/"
  ensure_directory "$issues_dir/archived/implemented" "issues/archived/implemented/"
  ensure_directory "$issues_dir/archived/deferred" "issues/archived/deferred/"
  ensure_directory "$issues_dir/archived/wont-fix" "issues/archived/wont-fix/"
  ensure_directory "$issues_dir/archived/duplicate" "issues/archived/duplicate/"
```

**Rationale:** Four skills (triage:17,54; implement:191,328; session-wrap-up:66; uat-run:72) already create or expect the five-bucket set. `bin/setup-project` is the lone straggler, so fresh installs miss the bucket until the first issue is implemented. This brings the installer in line with the skills.

### Issue 2a — `skills/setup/SKILL.md:22`: reconcile the question-count rule

**Decision:** Keep the per-section caps (5/3/5/4/2) as-is; reword the global rule so "5" reads as a ceiling that per-section caps may tighten, not a flat contradiction.

**Before (line 22):**
> **Rules:** Ask ONE question per turn. Wait for response. Offer 2-3 suggested answers plus "Type your own." Maximum 5 questions per section. Save progress to `conductor/setup_state.json` after each step.

**After:**
> **Rules:** Ask ONE question per turn. Wait for response. Offer 2-3 suggested answers plus "Type your own." Ask no more than 5 questions per section; some sections cap lower, as noted in each section heading. Save progress to `conductor/setup_state.json` after each step.

**Rationale:** The per-section caps are intentional and tighter; the global line just needs to frame 5 as an upper bound rather than a fixed count. Minimal change, no behavior shift.

### Issue 2b — `skills/setup/SKILL.md:159`: define Resume missing-file recovery

**Decision:** If a file from a completed section is missing on resume, warn the user and re-run that section to regenerate it (rather than silently skipping or aborting).

**Before (line 159):**
> If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, verify previously created files still exist.

**After:**
> If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, and verify previously created files still exist. If a file from a completed section is missing, warn the user and re-run that section to regenerate it before continuing.

**Rationale:** The Section→file mapping (59–71) means a missing artifact = a lost completed section. Re-running that section is the natural recovery and reuses existing Q&A logic; warning keeps the user informed. Abort would be too harsh; silent skip would leave a gap.

### Issue 3 — `skills/workflow-router/SKILL.md:37`: fix the stale Codex hooks claim

**Decision:** Drop "experimental", state Codex hooks are on by default (same nested schema as Claude), and replace the bare "26" by enumerating events the way `agents-md-sync:31` does (Codex 5; Claude adds 4 more).

**Before (line 37):**
> - **Hooks**: Some workflows benefit from hook-driven automation (e.g., SessionStart for context injection). Claude supports 26 lifecycle events; Codex has 5 experimental events. Plan accordingly.

**After:**
> - **Hooks**: Some workflows benefit from hook-driven automation (e.g., SessionStart for context injection). Both harnesses support lifecycle hooks using the same nested schema; Codex hooks are on by default (disable with `[features] hooks = false`). Codex covers 5 events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop); Claude adds SessionEnd, SubagentStop, PreCompact, and Notification. Plan accordingly.

**Rationale:** `README.md:166`, `codex/INSTALL.md:113`, and `agents-md-sync:31` already carry the correct framing; this line was simply missed in the `05e8101` Codex-accuracy sweep. The new wording matches `agents-md-sync:31`'s enumeration and removes the unsourced "26". README/INSTALL/agents-md-sync need no edits (already correct) — they are the consistency target only.

## Verification

1. `bash -n bin/setup-project` — syntax gate.
2. `python3 -m json.tool` on `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` — manifest gate.
3. Issue 1 functional check: run `setup-project` against a throwaway temp directory and confirm all five archive buckets (`tracked`, `implemented`, `deferred`, `wont-fix`, `duplicate`) are created.
4. Manual read-through of the three Markdown edits to confirm wording is consistent with README:166 / agents-md-sync:31 and reads cleanly in context.

## Out of Scope

- No test harness or doc-consistency linter (gate stays `bash -n` + manifest JSON checks).
- No setup Q&A behavior change beyond resolving the two documented contradictions.
- No edits to `README.md:166`, `codex/INSTALL.md:113`, or `agents-md-sync:31` (already correct).

## Notes

Independent fixes, no ordering constraint. The two `.md` edits carry no executable logic, so TDD does not apply; the bash edit is a single declarative line covered by the syntax gate plus the temp-dir functional check.
