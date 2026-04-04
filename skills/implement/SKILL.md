---
name: implement
description: Executes tasks from a track's implementation plan using Superpowers' TDD workflow and subagent-driven development. Use when ready to implement a track that has an approved spec and plan.
argument-hint: "[track-id] [--task X.Y] [--phase N]"
---

# Implement Track

Execute a track's plan using Superpowers' execution engine (subagent-driven or inline), with track progress management and phase checkpoints.

## Progress Checklist

Copy this checklist and track your progress:

```
Implementation Progress:
- [ ] Pre-flight: verify project initialized
- [ ] Track selection (argument or interactive)
- [ ] Context loading
- [ ] Track status → in-progress
- [ ] Execution mode selection
- [ ] Per-task loop: RED → GREEN → REFACTOR → commit → mark complete
- [ ] Phase review: code simplifier → code reviewer → auto-fix → INBOX
- [ ] Phase checkpoint → user approval
- [ ] (repeat tasks/phases)
- [ ] Track completion: final verification + status update
```

## Pre-flight

1. Verify project is initialized (conductor/workflow.md exists)
2. Load workflow config: TDD strictness, commit strategy, verification rules

## Track Selection

**If argument provided:** validate `conductor/tracks/{argument}/plan.md` exists.

**If no argument:** read `conductor/tracks.md`, show incomplete tracks:
```
Select a track to implement:

In Progress:
1. [~] auth_20260403 - User Authentication (Phase 2, Task 3)

Pending:
2. [ ] nav-fix_20260402 - Navigation Bug Fix

Enter number or track ID:
```

## Context Loading

Read all relevant context:
- `conductor/tracks/{trackId}/spec.md` — requirements
- `conductor/tracks/{trackId}/plan.md` — task list
- `conductor/tracks/{trackId}/metadata.json` — progress state
- `conductor/product.md` — product context
- `conductor/tech-stack.md` — technical constraints
- `conductor/workflow.md` — process rules
- `conductor/code_styleguides/` — language conventions

## Track Status Update

Mark track as in-progress:
- In `conductor/tracks.md`: change `[ ]` to `[~]`
- In metadata.json: set `status: "in_progress"`, update timestamp

## Execution Mode Selection

Detect Superpowers availability using the procedure in [docs/detecting-optional-skills.md](../../docs/detecting-optional-skills.md). The skill is available if any Codex-visible signal is positive. Check for both `subagent-driven-development` and `executing-plans`.

If Superpowers is available, offer the choice:

```
How should this track be implemented?

1. Subagent-driven (recommended) — fresh subagent per task with two-stage review
2. Inline execution — single session, batch checkpoints every 3 tasks
```

### Subagent-Driven Execution (via Superpowers)

Invoke the subagent-driven-development skill using the Skill tool, passing the track's plan from `conductor/tracks/{trackId}/plan.md`.

Superpowers handles:
- Fresh subagent per task (implementer → spec-reviewer → code-quality-reviewer)
- TDD enforcement (red → green → refactor)
- Per-task commits
- Final code review across entire implementation

**Our wrapper responsibilities (before/after Superpowers runs each task):**

Before dispatching each task's subagent, update metadata.json: set `current_task` to this task's ID (e.g., "2.3") and `current_phase` to the containing phase number. This ensures resume state is accurate even if the session is interrupted mid-task.

After each task completes, update track metadata:
- Mark task `[x]` in `conductor/tracks/{trackId}/plan.md`
- Increment `tasks.completed` in metadata.json
- Set `current_task` to the next incomplete task ID
- Check for phase completion

**Superpowers output control:** When invoking the skill, instruct it that all artifacts belong in `conductor/tracks/{trackId}/` — not `docs/superpowers/`. If Superpowers writes artifacts outside the track directory despite the instruction, move them in. If Superpowers invokes `finishing-a-development-branch` at the end, defer to our own Track Completion flow below instead — we manage the track lifecycle, not Superpowers.

### Inline Execution (via Superpowers)

Detect availability using the [detection procedure](../../docs/detecting-optional-skills.md). If no Codex-visible signal is positive, fall back to the no-Superpowers path below.

Invoke the executing-plans skill using the Skill tool, passing the track's plan.

Same metadata lifecycle: write `current_task` before each task starts, update counters after each task completes. Same output control: instruct Superpowers to write to the track directory, redirect anything that escapes, and handle completion via our Track Completion flow.

### Fallback (no Superpowers)

Execute tasks directly following TDD workflow from conductor/workflow.md:

For each incomplete task (`[ ]` in plan.md):

1. **Mark in-progress**: change `[ ]` to `[~]` in plan.md
2. **Update metadata.json**: set `current_task` to this task's ID (e.g., "2.3"), set `current_phase` to the containing phase number
3. **RED**: write failing test, verify it fails
4. **GREEN**: implement minimal code to pass, verify pass
5. **REFACTOR**: clean up, verify still passing
6. **Commit**: following commit strategy from workflow.md
7. **Mark complete**: change `[~]` to `[x]` in plan.md, increment `tasks.completed` in metadata.json

## Phase Checkpoints

After all tasks in a phase are `[x]`:

### 1. Determine Phase File Scope

Build the list of files this phase touched:

**Primary method:** Collect all "files to modify" entries from the phase's tasks in plan.md.

**Fallback (always run as supplement):** The plan.md list misses new files created during tasks and files touched incidentally. Always supplement with git:
- Find the phase's first task commit in `git log` (match by task ID or commit message convention from workflow.md)
- Diff from its parent: `git diff --name-only {parent-sha}..HEAD`
- Union with any files found in plan.md

This is the **phase file list** — all review and fixes are scoped to ONLY these files.

### 2. Phase Code Review

Launch Agent 1 first, then Agent 2 after it finishes. Running sequentially avoids edit conflicts when both agents fix the same file.

**Agent 1 — Code Simplifier:**
Detect the `simplify` skill using the [multi-signal procedure](../../docs/detecting-optional-skills.md). If found via any signal, invoke it with the phase file list. Otherwise, launch a general-purpose agent:

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
> - **In-scope** (file is in the phase file list): Apply the fix directly, regardless of severity. Fix everything — critical, warning, and nit.
> - **Out-of-scope** (file is NOT in the phase file list but you noticed an issue while reviewing code that calls into it): Do NOT fix. Return as a separate out-of-scope list.

**After both agents finish:**

1. If either agent made changes, commit following the commit strategy in workflow.md (e.g., `refactor: phase {N} code review fixes`). If neither agent made changes, skip the commit.
2. Collect out-of-scope issues from both agents. If any, append each as a bullet to `issues/INBOX.md`:
   ```
   - {description} in {file}:{line} ({severity}). Source: phase {N} review of {trackId}.
   ```
   If `issues/INBOX.md` does not exist, create the issues directory structure first (same as `/triage` bootstrap).

### 3. Run Verification

1. Run phase verification steps listed in plan.md
2. Run full test suite
3. If review fixes broke tests: fix the regression inline (do not re-launch review agents), amend the review fixes commit, re-run tests to confirm

### 4. Report and Wait for Approval

```
Phase {N} complete.

Results:
- All phase tasks: complete
- Code review: {X} in-scope fixes applied, {Y} out-of-scope issues filed to INBOX
- Tests: passing
- Verification: pass

Review fixes committed: {commit SHA or "none — code was clean"}
INBOX items added: {Y}

Approve to continue to Phase {N+1}?
1. Yes, continue
2. No, there are issues to fix
3. Pause implementation
```

**CRITICAL: Never proceed to the next phase without user approval.**

Update metadata.json: increment `phases.completed`.

## Error Handling

- **Tool failure**: HALT, present options (retry / skip / pause / revert)
- **Test failure**: HALT, show failures, offer fix / rollback / pause
- **Git failure**: HALT, show git status, suggest resolution

## Resumption

If resuming a paused track:
1. Load metadata.json for current state
2. Find current task:
   - If `current_task` field exists in metadata.json, use it
   - Otherwise, fall back to scanning plan.md: first task marked `[~]` (in-progress), or if none, first task marked `[ ]` (pending)
3. Ask: continue from here / restart current task / show progress

## Track Completion

When all phases and tasks are `[x]`:

1. Run final verification (full test suite + acceptance criteria from spec.md)
2. Update track status to complete:
   - In `conductor/tracks.md`: change `[~]` to `[x]`
   - In metadata.json: set `status: "complete"`
3. Offer cleanup: archive / keep as-is
4. Display summary:

```
Track Complete: {title}

Phases: {N}/{N}
Tasks: {M}/{M}
Commits: {count}
Tests: all passing

Next: Run /uat-create to generate acceptance testing checklist.
```
