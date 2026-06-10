# Specification: Maestro cleanup fixes

**Track ID:** cleanup-fixes_20260610
**Type:** chore
**Created:** 2026-06-10
**Status:** Approved

## Summary

Fix three small, independent maestro maintenance issues found during review:

1. `bin/setup-project` omits the `issues/archived/implemented/` scaffold bucket.
2. The `setup` skill has a self-contradicting question-count rule and an under-specified Resume path.
3. `skills/workflow-router/SKILL.md:37` carries a stale "Codex has 5 experimental events" claim, plus an unsourced "26 lifecycle events" Claude count.

## Context

Each fix resolves drift left over from recent work:

- The `implemented/` archive bucket was added to four skills (triage, implement, session-wrap-up, uat-run) in the 1.2.0 direct-issue-mode change (`b12ade8`) but never added to `bin/setup-project`, so fresh installs lack a directory the rest of the workflow expects.
- The two setup-skill edge cases were knowingly deferred from the setup-artifact-templates batch (`87716a5`).
- `workflow-router:37` was missed in the Codex-accuracy sweep (`05e8101`) that corrected the "experimental" framing everywhere else; it now contradicts the repo's own canonical statements (`README.md:166`, `agents-md-sync:31`).

All three are doc/scaffold drift, not behavioral defects. They are independent (different files, no shared state) and grouped into one chore track only for efficiency.

## Acceptance Criteria

**setup-project (Issue 1):**
- [ ] `ensure_issues_scaffold` creates `issues/archived/implemented/` in canonical order `{tracked,implemented,deferred,wont-fix,duplicate}`
- [ ] A fresh `setup-project` run produces all five archive buckets
- [ ] `bash -n bin/setup-project` passes

**setup skill (Issue 2):**
- [ ] The question-count rule is internally consistent (global ceiling vs. per-section caps clarified or aligned)
- [ ] The Resume path specifies what to do when a previously created file is missing

**workflow-router (Issue 3):**
- [ ] `SKILL.md:37` no longer calls Codex hooks "experimental"
- [ ] Codex hook framing matches `README.md:166` (on by default; disable with `[features] hooks = false`; same nested schema as Claude)
- [ ] The Claude lifecycle-event count is reconciled with `agents-md-sync:31` (9 enumerated events) or replaced with canonical framing rather than a bare "26"
- [ ] Wording is consistent across workflow-router, README, INSTALL, and agents-md-sync

**Cross-cutting:**
- [ ] Full validation suite passes (`bash -n bin/setup-project` + `python3 -m json.tool` on all four manifests)

## Dependencies

None. The three fixes are independent and touch different files.

## Out of Scope

- Adding a test harness or doc-consistency linter (the repo's gate stays `bash -n` + manifest JSON checks).
- Any behavioral change to the setup Q&A flow beyond resolving the documented contradictions.
- Editing `README.md:166`, `codex/INSTALL.md:113`, or `agents-md-sync:31`, which are already correct (referenced only as the consistency target).

## Technical Notes

- **Issue 1** — `bin/setup-project:256–279` (`ensure_issues_scaffold`); add one `ensure_directory "$issues_dir/archived/implemented" "issues/archived/implemented/"` line using the helper at `244–254`. Consumers that already create the bucket: triage:17,54; implement:191,328; session-wrap-up:66; uat-run:72.
- **Issue 2** — `skills/setup/SKILL.md`: global rule line 22; per-section caps lines 24/32/37/47/54 (5/3/5/4/2); Resume path line 159; artifact→file mapping 59–71; state schema 76–85. Decisions needed: "5 is a ceiling" vs. align numbers; missing-file recovery = regenerate / re-ask / warn.
- **Issue 3** — `skills/workflow-router/SKILL.md:37`. Canonical (already consistent): `README.md:166`, `codex/INSTALL.md:113`, `agents-md-sync:31`. Decision: keep an explicit event count (mirror agents-md-sync) or drop the number.
