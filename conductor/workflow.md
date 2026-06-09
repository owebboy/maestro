# Workflow

## TDD / Verification Discipline

**Flexible — validation scripts as the test gate.** This repo is primarily Markdown and Bash, so strict code-TDD does not apply to most changes. The verification gate is the `AGENTS.md` validation suite:

```bash
bash -n bin/setup-project
python3 -m json.tool .claude-plugin/plugin.json >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```

When a change introduces real executable logic, defer to Superpowers' TDD workflow (tests before code). Never claim a change works without running the relevant validation.

## Commit Strategy

**Descriptive, imperative subject.** Write the subject as a command (e.g. `Add direct issue mode to /implement`). Note the version when shipping a release (e.g. `(1.2.0)`). Doc-only changes may use the `docs:` prefix. Keep each commit scoped to one coherent change.

## Code Review

**Required for non-trivial changes.** Any change to skill behavior, install tooling, or manifests gets reviewed before merge. Trivial edits (typos, formatting, pure doc tweaks) are exempt. Use `/maestro:codebase-review` or Superpowers' code-review skills.

## Verification Checkpoints

**After each phase.** Run verification at the end of each plan phase rather than after every task or only at the end. At each checkpoint:

1. Run the validation suite above.
2. Confirm cross-harness metadata stays aligned (`.claude-plugin/` ↔ `.codex-plugin/`).
3. Confirm `README.md`, `codex/INSTALL.md`, `bin/setup-project`, and `agents/openai.yaml` are updated if a skill was added, renamed, or re-scoped.

## Track Lifecycle

`issues/INBOX.md` → `/triage` → `/issue-review` → `/issue-advance` → track → `/new-track` (spec + plan) → `/implement` → verify → `/uat-create` / `/uat-run` → `/session-wrap-up`.
