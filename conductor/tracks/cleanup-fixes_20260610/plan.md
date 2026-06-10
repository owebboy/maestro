# Maestro Cleanup Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land four small, independent documentation/scaffold fixes in the Maestro plugin (the `implemented/` scaffold bucket, two `setup` skill clarifications, and the stale `workflow-router` Codex hooks claim).

**Architecture:** Three issues, four edits, three files — no shared state, no ordering constraint. Each edit is exact-text and pre-specified in `conductor/tracks/cleanup-fixes_20260610/design.md`. One declarative bash line plus three Markdown wording fixes; no new executable logic.

**Tech Stack:** Bash (`bin/setup-project`), Markdown (`skills/*/SKILL.md`). Verification gate: `bash -n` + `python3 -m json.tool` on the four manifests, per `conductor/workflow.md`.

**Note on commits:** `maestro/` is a git submodule — git write commands require the sandbox disabled. Per repo convention (`conductor/workflow.md`), the whole track lands as one coherent commit at the end (Task 5).

---

## Phase 1 — Issue 1: setup-project `implemented/` bucket

### Task 1: Add `implemented/` to `ensure_issues_scaffold`

**Files:**
- Modify: `bin/setup-project` (in `ensure_issues_scaffold`, after the `tracked` line, ~line 266)

- [ ] **Step 1: Read the current block to confirm exact text**

Run: `sed -n '266,269p' bin/setup-project`
Expected: the four `ensure_directory` lines for tracked/deferred/wont-fix/duplicate.

- [ ] **Step 2: Insert the `implemented` line in canonical order**

Insert a new line immediately after the `tracked` line so the block reads:

```bash
  ensure_directory "$issues_dir/archived/tracked" "issues/archived/tracked/"
  ensure_directory "$issues_dir/archived/implemented" "issues/archived/implemented/"
  ensure_directory "$issues_dir/archived/deferred" "issues/archived/deferred/"
  ensure_directory "$issues_dir/archived/wont-fix" "issues/archived/wont-fix/"
  ensure_directory "$issues_dir/archived/duplicate" "issues/archived/duplicate/"
```

- [ ] **Step 3: Syntax check**

Run: `bash -n bin/setup-project`
Expected: no output, exit 0.

- [ ] **Step 4: Functional check against a throwaway dir**

Run:
```bash
TMPTEST="$(mktemp -d)"; bash bin/setup-project --help >/dev/null 2>&1 || true
# Drive only the scaffold: invoke setup-project against the temp dir per its usage,
# then list the buckets it created.
ls "$TMPTEST"/issues/archived 2>/dev/null
```
Expected: if the run created the issues scaffold, all five buckets appear: `deferred  duplicate  implemented  tracked  wont-fix`. If `setup-project`'s flags make a full dry-run impractical, instead assert the line is present:
```bash
grep -n 'archived/implemented' bin/setup-project
```
Expected: one match inside `ensure_issues_scaffold`.

## Phase 2 — Issue 2: setup skill clarifications

### Task 2: Reword the global question-count rule (Issue 2a)

**Files:**
- Modify: `skills/setup/SKILL.md:22`

- [ ] **Step 1: Replace the global rule sentence**

Before (line 22):
> **Rules:** Ask ONE question per turn. Wait for response. Offer 2-3 suggested answers plus "Type your own." Maximum 5 questions per section. Save progress to `conductor/setup_state.json` after each step.

After:
> **Rules:** Ask ONE question per turn. Wait for response. Offer 2-3 suggested answers plus "Type your own." Ask no more than 5 questions per section; some sections cap lower, as noted in each section heading. Save progress to `conductor/setup_state.json` after each step.

Change only the one sentence — leave the rest of line 22 intact. Do NOT touch the per-section caps on lines 24/32/37/47/54.

- [ ] **Step 2: Confirm the edit and that per-section caps are untouched**

Run: `grep -n 'no more than 5 questions' skills/setup/SKILL.md && grep -n 'max [0-9] questions\|max [0-9] question' skills/setup/SKILL.md`
Expected: the reworded rule on line 22; the five section caps (5/3/5/4/2) still present.

### Task 3: Add Resume missing-file recovery (Issue 2b)

**Files:**
- Modify: `skills/setup/SKILL.md:159`

- [ ] **Step 1: Replace the Resume sentence**

Before (line 159):
> If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, verify previously created files still exist.

After:
> If `--resume` or resuming from state: skip completed sections, resume from `current_section` + `current_question`, and verify previously created files still exist. If a file from a completed section is missing, warn the user and re-run that section to regenerate it before continuing.

- [ ] **Step 2: Confirm the edit**

Run: `grep -n 'warn the user and re-run that section' skills/setup/SKILL.md`
Expected: one match on the Resume line.

## Phase 3 — Issue 3: workflow-router Codex hooks claim

### Task 4: Replace the stale Codex hooks line

**Files:**
- Modify: `skills/workflow-router/SKILL.md:37`

- [ ] **Step 1: Replace the Hooks bullet**

Before (line 37):
> - **Hooks**: Some workflows benefit from hook-driven automation (e.g., SessionStart for context injection). Claude supports 26 lifecycle events; Codex has 5 experimental events. Plan accordingly.

After:
> - **Hooks**: Some workflows benefit from hook-driven automation (e.g., SessionStart for context injection). Both harnesses support lifecycle hooks using the same nested schema; Codex hooks are on by default (disable with `[features] hooks = false`). Codex covers 5 events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop); Claude adds SessionEnd, SubagentStop, PreCompact, and Notification. Plan accordingly.

- [ ] **Step 2: Confirm no stale strings remain**

Run: `grep -rn 'experimental events\|26 lifecycle' skills/workflow-router/SKILL.md`
Expected: no matches.

- [ ] **Step 3: Confirm consistency with the canonical source**

Run: `grep -n 'on by default' skills/workflow-router/SKILL.md README.md skills/agents-md-sync/SKILL.md`
Expected: workflow-router:37 now matches the README:166 / agents-md-sync:31 framing.

## Phase 4 — Verification & commit

### Task 5: Full validation suite and commit

**Files:** none (verification + commit only)

- [ ] **Step 1: Run the repo validation gate**

Run:
```bash
bash -n bin/setup-project
python3 -m json.tool .claude-plugin/plugin.json >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```
Expected: all commands exit 0, no output.

- [ ] **Step 2: Review the diff**

Run: `git diff --stat && git diff`
Expected: changes only in `bin/setup-project`, `skills/setup/SKILL.md`, `skills/workflow-router/SKILL.md` (plus the track/issue bookkeeping files).

- [ ] **Step 3: Commit (sandbox disabled — submodule)**

```bash
git add bin/setup-project skills/setup/SKILL.md skills/workflow-router/SKILL.md
git commit -m "Fix cleanup batch: add implemented/ scaffold bucket, clarify setup question caps + resume recovery, refresh workflow-router Codex hooks claim"
```
Expected: one commit containing the four edits.

---

## Self-Review

- **Spec coverage:** Issue 1 → Task 1; Issue 2a → Task 2; Issue 2b → Task 3; Issue 3 → Task 4; cross-cutting validation suite → Task 5. All acceptance criteria mapped.
- **Placeholders:** none — every edit carries exact before/after text and an explicit verification command.
- **Consistency:** the `implemented` bucket label and canonical order `{tracked,implemented,deferred,wont-fix,duplicate}` match the design and the four consumer skills; the workflow-router after-text matches agents-md-sync:31's event enumeration.
- **TDD note:** no executable logic added beyond one declarative bash line, so code-TDD does not apply; verification is the repo's syntax + manifest gate plus the temp-dir bucket check (per `conductor/workflow.md`).
