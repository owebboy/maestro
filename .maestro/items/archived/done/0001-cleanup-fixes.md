---
id: 0001-cleanup-fixes
title: Maestro cleanup fixes
type: chore
priority: P3
status: done
weight: tracked
created: 2026-06-10
updated: 2026-06-10
artifacts:
  - { kind: spec, ref: .maestro/work/0001-cleanup-fixes/spec.md }
  - { kind: design, ref: .maestro/work/0001-cleanup-fixes/design.md }
  - { kind: plan, ref: .maestro/work/0001-cleanup-fixes/plan.md }
---

# Maestro cleanup fixes


## Notes

> Migrated from conductor track `cleanup-fixes_20260610`.

## Tasks

- [x] t1 — **Step 1: Read the current block to confirm exact text**
- [x] t2 — **Step 2: Insert the `implemented` line in canonical order**
- [x] t3 — **Step 3: Syntax check**
- [x] t4 — **Step 4: Functional check against a throwaway dir**
- [x] t5 — **Step 1: Replace the global rule sentence**
- [x] t6 — **Step 2: Confirm the edit and that per-section caps are untouched**
- [x] t7 — **Step 1: Replace the Resume sentence**
- [x] t8 — **Step 2: Confirm the edit**
- [x] t9 — **Step 1: Replace the Hooks bullet**
- [x] t10 — **Step 2: Confirm no stale strings remain**
- [x] t11 — **Step 3: Confirm consistency with the canonical source**
- [x] t12 — **Step 1: Run the repo validation gate**
- [x] t13 — **Step 2: Review the diff**
- [x] t14 — **Step 3: Commit (sandbox disabled — submodule)**

> Origin issue: 2026-06-10-setup-implemented-bucket.md (advanced-to cleanup-fixes_20260610).

### Original issue

# Issue: setup-project scaffold omits archived/implemented/ bucket

## Summary

`bin/setup-project`'s `ensure_issues_scaffold` omits the `issues/archived/implemented/` bucket, so fresh installs lack the directory four other skills already create and write to.

## Problem Description

`ensure_issues_scaffold` (bin/setup-project:256–269) creates `issues/archived/{tracked,deferred,wont-fix,duplicate}/` but omits `archived/implemented/`. Four other skills already create or expect the full five-bucket set, including `implemented/`: triage (skills/triage/SKILL.md:17,54), implement (skills/implement/SKILL.md:191,328), session-wrap-up (skills/session-wrap-up/SKILL.md:66), and uat-run (skills/uat-run/SKILL.md:72). The `implement` skill moves finished issue files into `implemented/`, creating the directory only when missing — so a fresh `setup-project` install lacks the bucket until the first issue completes.

`bin/setup-project` is the lone straggler on four buckets. Add `archived/implemented/` (in canonical order, right after `tracked/`) for consistency with the other skills.

## Acceptance Criteria

- [ ] `ensure_issues_scaffold` creates `issues/archived/implemented/` alongside the other four buckets, in canonical order `{tracked,implemented,deferred,wont-fix,duplicate}`
- [ ] A fresh `setup-project` run produces all five archive buckets
- [ ] `bash -n bin/setup-project` passes (repo verification gate)

## Technical Context

### Affected Files

- `bin/setup-project:256–279` — `ensure_issues_scaffold`; lines 266–269 create only four buckets (the fix site)
- `bin/setup-project:244–254` — `ensure_directory` helper (`mkdir -p` + status note) used to add the bucket
- `skills/triage/SKILL.md:17,54` — bootstrap and "ensure archive dirs" both list all five buckets including `implemented`
- `skills/implement/SKILL.md:191,328` — creates the five-bucket set, and moves completed issues into `archived/implemented/`
- `skills/session-wrap-up/SKILL.md:66`, `skills/uat-run/SKILL.md:72` — both create the five-bucket set when bootstrapping INBOX

### Related Tests

None. The repo has no functional test harness; the verification gate is a syntax check only (`bash -n bin/setup-project`, per conductor/workflow.md and conductor/code_styleguides/bash.md:20). No test would have caught this scaffold gap. The only runtime validation is `bin/hooks/validate-issue-frontmatter.sh`, which checks issue frontmatter, not setup output.

### Similar Patterns

- `b12ade8` ("Add direct issue mode to /implement (1.2.0)") introduced the `implemented` bucket and updated triage + workflow-router, but did not touch `bin/setup-project`.
- `b609118` ("Improve setup-project portability", 2026-04-20) refactored the script but predates the bucket and never added it.
- `docs/specs/2026-06-09-implement-direct-issue-mode-design.md:39,45` documents `implemented` as the fifth archive state.

## Dependencies

None.

## Out of Scope

## Notes

Trivial one-line fix: add `ensure_directory "$issues_dir/archived/implemented" "issues/archived/implemented/"` after the `tracked` line.

> Origin issue: 2026-06-10-setup-skill-edge-cases.md (advanced-to cleanup-fixes_20260610).

### Original issue

# Issue: setup skill — two unhandled edge cases (question caps, Resume)

## Summary

The `setup` skill has two unresolved edge cases deferred from the setup-artifact-templates work: a self-contradicting question-count rule and an under-specified Resume path.

## Problem Description

First, SKILL.md:22 states "Maximum 5 questions per section," but the section headers declare per-section caps of 5, 3, 5, 4, and 2 (Sections 1–5). Sections 2, 4, and 5 fall below the stated maximum, so the rules read as contradictory. Reconcile them: either state that 5 is a ceiling the per-section caps tighten, or align the numbers.

Second, the Resume path (SKILL.md:159) says to "verify previously created files still exist" but does not say what to do when a file is missing — regenerate it, re-ask the section, or warn. Define the recovery behavior, ideally per artifact in the Section→file mapping.

## Acceptance Criteria

- [ ] The question-count rule is internally consistent (global ceiling vs. per-section caps clarified or aligned)
- [ ] The Resume path specifies what to do when a previously created file is missing

## Technical Context

### Affected Files

- `skills/setup/SKILL.md:22` — global rule "Maximum 5 questions per section"
- `skills/setup/SKILL.md:24,32,37,47,54` — per-section caps: S1 max 5, S2 max 3, S3 max 5, S4 max 4, S5 max 2
- `skills/setup/SKILL.md:159` — Resume path ("verify previously created files still exist")
- `skills/setup/SKILL.md:59–71` — Artifact Generation table mapping each section to the file(s) it creates (product.md, product-guidelines.md, tech-stack.md, workflow.md, code_styleguides/, plus index.md and tracks.md) — this defines what "previously created files" means
- `skills/setup/SKILL.md:76–85` — `setup_state.json` schema (`current_section`, `current_question`) that the Resume path reads

### Related Tests

None. No SKILL.md linter and no `setup_state.json` schema validator exist, so neither edge case would be caught automatically. The only runtime validation hook (`bin/hooks/validate-issue-frontmatter.sh`) covers issue frontmatter, not skill documents.

### Similar Patterns

- Deferred from the setup-artifact-templates work (commit `87716a5`, "Implement Templates batch").
- `issues/archived/implemented/2026-06-09-setup-artifact-templates.md:23–24,74–83` explicitly identified both edge cases and recorded leaving them out of scope per the approved decision. (That archived note cited the Resume line as `SKILL.md:126`; the line has since drifted to `:159`.)

## Dependencies

None.

## Out of Scope

## Notes

Deferred from the setup-artifact-templates work. Pure documentation fix to `skills/setup/SKILL.md` — no code change.

> Origin issue: 2026-06-10-workflow-router-codex-hooks.md (advanced-to cleanup-fixes_20260610).

### Original issue

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
