---
status: tracked
type: bug
priority: P2
filed: 2026-06-10
advanced-to: cleanup-fixes_20260610
---

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
