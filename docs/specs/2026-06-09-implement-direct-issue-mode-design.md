# Design: /implement direct issue mode

**Date:** 2026-06-09
**Status:** Approved

`/implement` accepts issue files directly, making the track ceremony (spec Q&A, brainstorm, phased plan) optional for simple work. Approach A from brainstorming: extend `/implement` rather than add a new skill or a flag on `/issue-advance`, because implement is the execution entry point and already loads the context the simplicity assessment needs.

## 1. Interface and mode detection

Argument becomes `[track-id | issue-file-path]`. At Track Selection, an argument that is a path to an existing `.md` file under `issues/` enters **issue mode**; anything else follows the existing track flow unchanged.

- Eligible statuses: `reviewed` (preferred) and `triaged`. A `triaged` issue gets a one-line caveat that Technical Context is empty, so sizing is less informed.
- Any other status (tracked, implemented, wont-fix, deferred, duplicate): tell the user and stop.
- No batch mode — one issue per invocation.

## 2. Simplicity gate

The model assesses the issue against four criteria, stated in the skill so every platform judges identically:

1. Acceptance criteria are concrete and testable as written
2. Expected change surface is ~3 files or fewer (from Technical Context's Affected Files when present, otherwise a quick scan)
3. No design decisions: no new architecture, schema/API changes, or new dependencies
4. Completable in a single session

The model presents a verdict with one-line reasoning per criterion. The user confirms: implement directly / advance to a track / cancel. Failing any criterion flips the recommendation to "advance," but the user can override in either direction — the gate informs, the user decides.

## 3. Execution flow (direct mode)

The issue file is the spec; acceptance criteria are the verification contract.

1. Load `conductor/workflow.md` for TDD strictness and commit strategy if `conductor/` exists; otherwise use defaults (strict TDD, single commit) with a note. Direct mode works in projects that never ran `/setup`.
2. Run the existing "Fallback (no Superpowers)" TDD loop — reused, not duplicated: RED → GREEN → REFACTOR per acceptance criterion. No subagents required, making this the most portable path in the plugin.
3. One commit, message referencing the issue file.
4. One final gate: acceptance-criteria checklist, test results, `git diff --stat`; user approves before archive.
5. Scope escalation: if the work exceeds the assessed scope (more files, a design decision surfaces), stop and present: continue anyway / escalate to issue-advance / pause. Escalation does not carry WIP.

## 4. Lifecycle: the `implemented` archive state

On approval, the issue frontmatter gains `status: implemented`, `implemented: YYYY-MM-DD` (obtained via `date +%Y-%m-%d`), and `commit: <sha>`. The file moves to `issues/archived/implemented/` (created if missing). Fifth archive state alongside tracked, deferred, wont-fix, duplicate.

## 5. Ripple changes

- `skills/triage/SKILL.md`: bootstrap and ensure-archive-dirs add `implemented/` to the archived subdirectory set
- `bin/hooks/validate-issue-frontmatter.sh`: accept `implemented` as a valid status
- `skills/manage/SKILL.md`: cleanup recognizes `archived/implemented/`
- `skills/implement/SKILL.md` description + `agents/openai.yaml`: add the issue-file trigger; contrast clause becomes "takes a track ID or an issue file; for a designed track from an issue, use issue-advance"
- `skills/workflow-router/SKILL.md`: routing entry for "small reviewed issue → /implement <issue-path>"
- `README.md`: skill table, flow diagram
- `AGENTS.md`: implement skill line

## 6. Error handling

- Path doesn't exist → say so, stop
- Malformed/missing frontmatter → show what's wrong, offer to fix or stop
- Pre-existing test failures at RED → HALT (implement's existing convention)
- User rejects at final gate → offer: fix and re-present / revert / file follow-ups to `issues/INBOX.md`

## 7. Out of scope

Batch direct mode (`all`), grouping multiple issues into one run, auto-escalation carrying WIP into a new track, changes to issue-advance's flow.
