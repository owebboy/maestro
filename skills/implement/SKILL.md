---
name: implement
description: Use when ready to implement a work item — tracked (has spec+plan) or light (simple enough to fix directly). Takes a work-item ref.
argument-hint: "[item-ref] [--task X.Y] [--phase N]"
---

# Implement

Execute a work item to completion. Works for both tracked items (have a spec+plan) and light items (implement directly from body). Uses abstract ops; the active adapter handles all storage.

## Progress Checklist

Copy this checklist and track your progress:

```
Implementation Progress:
- [ ] Pre-flight: verify project initialized
- [ ] Item selection (argument or interactive)
- [ ] Context loading
- [ ] set_status(id, in-progress)
- [ ] Execution (tracked: per-task loop with set_subtask_state; light: direct)
- [ ] Phase review: code simplifier → code reviewer → capture_raw out-of-scope
- [ ] Phase checkpoint → user approval
- [ ] (repeat tasks/phases for tracked)
- [ ] Completion: final verification + set_status(id, in-review | done)
```

## Pre-flight

Verify project is initialized (`.maestro/context/workflow.md` exists). If it does not exist, inform the user and stop (suggest `/setup` or `$setup`).

Load workflow config from `.maestro/context/workflow.md`: TDD strictness, commit strategy, verification rules.

## Item Selection

**If argument provided:** call `get_item(ref)` to resolve the loose ref (bare id, slug, or `work/<id>` path) and load the item record.

**If no argument:** call `list_items({status: in-progress})` and `list_items({status: planned})`, then show the union:

```
Select a work item to implement:

In Progress:
1. [~] 0042-user-auth — User Authentication

Planned:
2. [ ] 0017-nav-fix — Navigation Bug Fix

Enter number or item ref:
```

Then call `get_item(ref)` on the chosen item.

## Context Loading

Read all relevant context:
- `.maestro/work/<id>/spec.md` — requirements (tracked items; skip if not present)
- `.maestro/context/product.md` — product context
- `.maestro/context/tech-stack.md` — technical constraints
- `.maestro/context/workflow.md` — process rules
- `.maestro/context/styleguides/` — language conventions

## Status Update

Call `set_status(id, in-progress)`.

## Execution Mode: Tracked vs Light

Branch on the item's `weight` field returned by `get_item`.

### weight == tracked

Read detailed steps from `.maestro/work/<id>/plan.md`. This file is the source of truth for **steps**; the `## Tasks` checklist in the item record is the source of truth for **status** (updated via `set_subtask_state`).

Detect `subagent-driven-development` and `executing-plans` using the [detection procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory). Check both plugin-prefixed and bare forms.

If Superpowers is available, offer the choice:

```
How should this item be implemented?

1. Subagent-driven (recommended) — fresh subagent per task with two-stage review
2. Inline execution — single session, batch checkpoints every 3 tasks
```

#### Subagent-Driven Execution (via Superpowers)

Invoke the subagent-driven-development skill using the detected form, passing the plan from `.maestro/work/<id>/plan.md`.

**Our wrapper responsibilities (before/after Superpowers runs each task):**

Before dispatching each task's subagent: `set_subtask_state(id, <ref>, doing)`.

After each task completes: `set_subtask_state(id, <ref>, done)`. Check for phase completion.

**Superpowers output control:** When invoking the skill, instruct it that all artifacts belong in `.maestro/work/<id>/` — not `docs/superpowers/`. If Superpowers writes artifacts outside the work directory despite the instruction, move them in. If Superpowers invokes `finishing-a-development-branch` at the end, defer to our own Completion flow below.

#### Inline Execution (via Superpowers)

Detect `executing-plans` using the [detection procedure](../../docs/detecting-optional-skills.md). If found, invoke it with the plan. Same subtask lifecycle: `set_subtask_state(id, <ref>, doing)` before each task, `set_subtask_state(id, <ref>, done)` after. Same output control.

#### Fallback (no Superpowers)

Execute tasks directly following TDD workflow from `.maestro/context/workflow.md`:

For each incomplete task (`[ ]` in plan.md):

1. **Mark doing**: `set_subtask_state(id, <ref>, doing)`
2. **RED**: write failing test, verify it fails
3. **GREEN**: implement minimal code to pass, verify pass
4. **REFACTOR**: clean up, verify still passing
5. **Commit**: following commit strategy from `.maestro/context/workflow.md`
6. **Mark done**: `set_subtask_state(id, <ref>, done)`

### weight == light

Implement directly from the item body. No plan.md required.

#### Simplicity gate

Before executing, assess the item against all four criteria and present a one-line verdict for each:

1. **Testable** — acceptance criteria are concrete and verifiable as written
2. **Small** — expected change surface is ~3 files or fewer
3. **No design decisions** — no new architecture, schema/API changes, or new dependencies
4. **Single session** — completable in one sitting

Then ask the user:

```
Recommendation: {implement directly | advance to a tracked item}

1. Implement directly
2. Advance to a tracked item instead (/issue-advance in Claude Code, $issue-advance in Codex)
3. Cancel
```

Failing any criterion flips the recommendation to "advance" — but the user decides; honor an override in either direction.

#### Execute with TDD

Run the RED → GREEN → REFACTOR loop driven by the acceptance criteria instead of plan tasks: write a failing test per criterion, make it pass, refactor. If the project has no test suite, say so and verify each acceptance criterion by inspection instead.

If the test suite fails before you change anything: HALT and show the failures — do not build on a broken baseline.

**Scope escalation:** if the work exceeds the assessed size (more files than expected, a design decision surfaces), stop and present: continue anyway / escalate to `/issue-advance` / pause. Escalation does not carry work-in-progress.

Out-of-scope findings discovered during execution: call `capture_raw("<desc> in <file>:<line> (<severity>). Source: implement of <id>.")` — do not expand the current item's scope.

Commit once, following the commit strategy from `.maestro/context/workflow.md`; reference the item id in the commit message.

## Phase Checkpoints (tracked items only)

After all tasks in a phase are done:

### 1. Determine Phase File Scope

Build the list of files this phase touched:

**Primary method:** Collect all "files to modify" entries from the phase's tasks in `.maestro/work/<id>/plan.md`.

**Fallback (always run as supplement):** Always supplement with git:
- Find the phase's first task commit in `git log`
- Get its parent SHA with `git rev-parse {first-task-commit}^`
- Diff from its parent: `git diff --name-only {parent-sha}..HEAD`
- If no task commit is found, skip the git supplement and use the plan.md file list only
- Union with any files found in plan.md

This is the **phase file list** — all review and fixes are scoped to ONLY these files.

### 2. Phase Code Review

Launch Agent 1 first, then Agent 2 after it finishes. Running sequentially avoids edit conflicts.

**Agent 1 — Code Simplifier:**
Detect the `simplify` skill using the [multi-signal procedure](../../docs/detecting-optional-skills.md). If found, invoke it with the phase file list. Otherwise, launch a general-purpose agent:

> Review ONLY the following files from this phase: [phase file list].
> Check for: unnecessary complexity, duplicated logic across the phase's files, dead code introduced by this phase, inconsistent patterns between tasks in this phase.
> For each issue found: state the file, line, and a concrete fix. Apply all fixes directly — do not ask for approval.
> If you discover issues in files outside the phase file list during your review, do NOT fix them. Return them as a separate out-of-scope list.

**Agent 2 — Code Reviewer:**
Launch after Agent 1 completes so it reviews the already-simplified code:

> Review ONLY the following files from this phase: [phase file list].
> Check for:
> - Security issues (injection, XSS, unvalidated input at boundaries)
> - Performance regressions (N+1 queries, unnecessary re-renders, missing indexes)
> - Correctness bugs (off-by-one, null handling, race conditions)
> - Missing error handling at system boundaries
> - Style and cosmetic issues (naming, formatting, dead imports)
>
> For each issue found: state the file, line, severity (critical/warning/nit), and fix.
> - **In-scope** (file is in the phase file list): Apply the fix directly, regardless of severity.
> - **Out-of-scope** (file is NOT in the phase file list): Do NOT fix. Return as a separate out-of-scope list.

If your harness cannot spawn subagents, do this work yourself sequentially.

**After both agents finish:**

1. If either agent made changes, commit following the commit strategy in `.maestro/context/workflow.md` (e.g., `refactor: phase {N} code review fixes`). If neither made changes, skip the commit.
2. Collect out-of-scope issues from both agents. For each, call:
   ```
   capture_raw("<desc> in <file>:<line> (<severity>). Source: implement of <id>.")
   ```

### 3. Run Verification

1. Run phase verification steps listed in `.maestro/work/<id>/plan.md`
2. Run full test suite
3. If review fixes broke tests: fix the regression inline, amend the review fixes commit, re-run tests to confirm

### 4. Report and Wait for Approval

```
Phase {N} complete.

Results:
- All phase tasks: complete
- Code review: {X} in-scope fixes applied, {Y} out-of-scope issues captured
- Tests: passing
- Verification: pass

Review fixes committed: {commit SHA or "none — code was clean"}

Approve to continue to Phase {N+1}?
1. Yes, continue
2. No, there are issues to fix
3. Pause implementation
```

**CRITICAL: Never proceed to the next phase without user approval.**

## Error Handling

- **Tool failure**: HALT, present options (retry / skip / pause / revert)
- **Test failure**: HALT, show failures, offer fix / rollback / pause
- **Git failure**: HALT, show git status, suggest resolution

## Resumption

If resuming a paused item:
1. Call `get_item(ref)` for current state — check `subtasks` for in-progress or pending tasks
2. Find current task: first subtask with state `doing`, or if none, first with state `todo`
3. Ask: continue from here / restart current task / show progress

## Completion

When all tasks are done (tracked) or the implementation is complete (light):

1. Run final verification (full test suite + acceptance criteria from spec.md or item body)
2. Get the current commit SHA
3. Call `comment(id, "Implemented in <sha>.")`
4. Determine completion status:
   - Set `in-review` if EITHER (a) the item body has a non-empty `## Acceptance Criteria` section that warrants UAT verification, OR (b) `.maestro/context/workflow.md` defines a review/UAT step (e.g. a `reviewer:` field or a documented review gate). Otherwise set `done`.
   - Call `set_status(id, in-review)` or `set_status(id, done)` accordingly.
5. Display summary:

```
Item Complete: {title}

Tasks: {M}/{M} (tracked) or direct implementation (light)
Commit: {sha}
Tests: all passing
Status: {in-review | done}

Next: Run /uat-create in Claude Code or $uat-create in Codex to generate an acceptance testing checklist.
```
