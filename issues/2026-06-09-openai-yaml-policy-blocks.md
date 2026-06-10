---
status: reviewed
type: chore
priority: P3
filed: 2026-06-09
---

# Issue: Five openai.yaml files omit the allow_implicit_invocation policy block

## Summary

new-track, status, triage, uat-create, and setup omit the `policy: allow_implicit_invocation` block their ten siblings set — and several are file-writing skills, so the omission errs in the unsafe direction.

## Problem Description

Ten skills set an explicit policy; five rely on the Codex default. For file-writing skills (new-track, triage, uat-create, setup) the missing block means Codex may invoke them implicitly where siblings with equal risk (e.g., issue-close) require explicit invocation. Decide the intended default per skill and state it explicitly everywhere so the plugin-wide convention holds. Also: issue-review's short_description omits its argument and batch modes, and session-wrap-up's short_description is keyword-poor for discovery — fix while in these files.

## Acceptance Criteria

- [ ] All 15 agents/openai.yaml files carry an explicit `policy: allow_implicit_invocation` value
- [ ] File-writing skills are explicit-only unless deliberately decided otherwise (resolved: file-writers false, read-only status true, router true)
- [ ] short_descriptions reviewed for accuracy alongside the policy pass

## Technical Context

### Affected Files

Confirmed by `grep -rn "policy:" skills/*/agents/openai.yaml`: 10 of 15 files set `policy.allow_implicit_invocation: false`; these 5 omit the block entirely:

- `skills/new-track/agents/openai.yaml:1-4` — 4-line file, no policy block. File-writing (writes `conductor/tracks/{trackId}/design.md` and spec/plan — see SKILL.md:82).
- `skills/status/agents/openai.yaml:1-4` — 4-line file, no policy block. Read-only (displays project status); implicit invocation likely harmless here — the human call.
- `skills/triage/agents/openai.yaml:1-4` — 4-line file, no policy block. File-writing (creates issue files — see SKILL.md:62,81).
- `skills/uat-create/agents/openai.yaml:1-4` — 4-line file, no policy block. File-writing (writes UAT checklist — see SKILL.md:39).
- `skills/setup/agents/openai.yaml:1-4` — 4-line file, no policy block. File-writing (writes conductor context artifacts — see SKILL.md).
- `skills/issue-review/agents/openai.yaml:3` — `short_description: "Add codebase context to a triaged issue."` omits the `all` batch mode and the file-path argument (SKILL.md:4 `argument-hint: "<issue-file-path> | all"`).
- `skills/session-wrap-up/agents/openai.yaml:3` — `short_description: "Wrap up session work and context."` is keyword-poor for discovery (no "commit", "review", "CLAUDE.md/AGENTS.md", "follow-ups").

Reference (sibling that already sets the block, to copy verbatim): `skills/issue-close/agents/openai.yaml:6-7`.

Convention source of truth: `AGENTS.md:37` — "Use `allow_implicit_invocation: false` for routing-only, destructive, or session-finalizing skills." Also `conductor/product-guidelines.md:12` and `conductor/code_styleguides/markdown.md:15`.

### Related Tests

No automated test suite (Markdown + Bash plugin). Validate by:
- `grep -rn "policy:" skills/*/agents/openai.yaml` returning all 15 files after the change (currently 10).
- Confirming each value is YAML-valid: `python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('skills/*/agents/openai.yaml')]"` (yaml lib permitting) or eyeball against the issue-close sibling.
- Sonnet skill verification of the touched skills (per repo memory: verification subagents run on Sonnet).
- Spot-check the two reworded short_descriptions against their SKILL.md descriptions for accuracy.

### Similar Patterns

- `skills/issue-close/agents/openai.yaml:6-7` — canonical 4-field `interface` + `policy` block to copy for the 5 missing files.
- The other 9 explicit siblings (codebase-review, agents-md-sync, implement, issue-advance, issue-review, manage, session-wrap-up, uat-run, workflow-router) all place `policy:` at line 6 with `allow_implicit_invocation: false` at line 7.
- Related commit `33cf87a "Improve Codex skill metadata and add review artifacts"` and `afba736 "Make Maestro first-class for Codex"` established the openai.yaml metadata pattern.
- `issues/2026-06-09-workflow-router-invocation.md` debates flipping workflow-router's policy to `true` — same convention, opposite direction (advisory read-only skill). Cross-reference when deciding the per-skill default rationale.

## Dependencies

Coordinate with the trigger-first description rewrite (`issues/2026-06-09-trigger-first-descriptions.md`) to avoid editing the same files twice — that issue rewrites `skills/*/agents/openai.yaml` `short_description` lines (where they echo old SKILL.md phrasing), the same lines this issue touches for issue-review and session-wrap-up. Land them together or sequence so the short_description edits don't conflict.

Cross-reference `issues/2026-06-09-workflow-router-invocation.md`, which proposes setting workflow-router's `allow_implicit_invocation: true`. It uses the same `policy` block this issue standardizes, so the two should agree on the per-skill rationale (explicit-only for file-writing/destructive/session-finalizing; implicit allowed for read-only/advisory).

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.

**OPEN DECISION (human call) — intended `allow_implicit_invocation` value per file:**
The documented convention (`AGENTS.md:37`) is explicit-only for "routing-only, destructive, or session-finalizing" skills — which is narrower than "file-writing." None of the 5 missing skills are strictly destructive (they create new artifacts, not delete/overwrite irreversibly), so the per-skill default is a judgment call:

- `new-track`, `triage`, `uat-create`, `setup` — file-writing but additive. Set `false` (treat creating files as side-effecting, matching issue-close's caution) or `true` (low blast radius, additive only)? Recommend a default but the human decides.
- `status` — read-only display. `true` is the safe-and-convenient choice, but confirm.

Pick one value for each of the 5 and add the `policy` block; the goal is that all 15 files state the value explicitly, not that they all share the same value.

**Decision (approved 2026-06-09):** APPROVED: every one of the 15 skills/*/agents/openai.yaml carries an EXPLICIT `allow_implicit_invocation` value (no reliance on the Codex default). For the file-writers currently missing it — new-track, triage, uat-create, setup -> set `false` (explicit-only, matching issue-close's caution). Read-only `status` -> `true`. workflow-router -> `true` (per workflow-router-invocation). Also fix the issue-review and session-wrap-up short_descriptions. Coordinate with trigger-first-descriptions (same files).
