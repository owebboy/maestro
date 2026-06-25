---
name: session-wrap-up
description: Use when a Claude Code or Codex session is ending, the user is wrapping up, or says they're done for now.
---

# Session Wrap-Up

Run this at the end of a Claude Code or Codex session to close out cleanly. The goal is to leave the codebase, documentation, and project metadata in a state where a future session or another developer can pick up seamlessly.

## Phase 0: Determine Session Scope

Before any review, establish exactly which files this session touched. Do NOT rely on `git diff` or `git status` alone — those include pre-existing changes from before the session started.

**The session scope is determined by reviewing your conversation history:**
1. List every file you created, edited, or wrote during this conversation
2. This is the **session file list** — all reviews and commits are scoped to ONLY these files
3. If `git status` shows changes to files NOT in your session file list, those are pre-existing — ignore them entirely (do not review, do not commit, do not fix)

**Identify active work items from this session:**
Call `list_items({status: in-progress})` and `list_items({status: planned})`. From the results, identify the item(s) touched this session by cross-referencing with your conversation history (e.g., which item ID was being implemented, spec/plan files read, or artifact paths mentioned). If no item matches, proceed without an active item.

## Phase 1: Parallel Quality Review

Launch three agents in parallel. Pass each agent the **session file list** explicitly — give them the specific file paths rather than telling them to use `git diff HEAD`.

### Agent 1 — Code Simplifier
Detect the `simplify` skill using the [detection procedure](../../docs/detecting-optional-skills.md), checking both plugin-prefixed and bare forms. If found via any signal, use the detected invocation form. Pass it the session file list so it only reviews files from this session. Otherwise, launch a general-purpose agent that reviews for unnecessary complexity, duplication, and dead code.

### Agent 2 — Code Reviewer
Launch a general-purpose agent with this prompt:

> Review ONLY the following files changed in this session: [session file list].
> Do NOT review any other files, even if they appear in git status.
> Check for:
> - Security issues (injection, XSS, unvalidated input at boundaries)
> - Performance regressions (N+1 queries, unnecessary re-renders, missing indexes)
> - Correctness bugs (off-by-one, null handling, race conditions)
> - Missing error handling at system boundaries
>
> For each finding, state the file, line, severity (critical/warning/nit), and a one-line fix suggestion. If nothing found, say "No issues found."

### Agent 3 — Spec Review (conditional)
Only run this agent if an active work item was identified in Phase 0.

> Read `.maestro/work/{id}/spec.md` and `.maestro/work/{id}/plan.md` for the item active this session. Then read ONLY the files from this session: [session file list]. Compare and report:
> - Spec items that were implemented but diverged from the spec
> - Spec items that were not implemented (gaps)
> - Implementation work that wasn't in the spec (scope creep)
> - Plan tasks that should be marked complete but aren't
>
> If no active item was worked on this session, skip this review and say so.

If your harness cannot spawn subagents (e.g. Gemini CLI, Copilot CLI, or plain chat), do this work yourself sequentially, using each agent's brief above as a checklist.

Wait for all agents to complete. Apply any fixes from the code reviewer that are critical or warning severity (ask before applying nits). Report a brief summary of all reviews.

If a reviewer flags issues in files outside the session file list, discard those findings and capture them as follow-ups instead of fixing them — they belong to a different session's work.

## Phase 2: Follow-Up Capture

Two things happen here:

1. **Ask the user directly:** "Were there any issues, bugs, TODOs, or out-of-scope items that came up during this session that haven't been addressed or captured?"

2. **Scan the conversation** for unresolved items — look for phrases like "TODO", "we should", "out of scope", "later", "hack", "workaround", "skip for now", or anything that sounds like deferred work. Present any findings to the user for confirmation.

For each confirmed item, call `capture_raw("<brief description of the item>")`. Each call submits one follow-up to the backend's inbox (or `.maestro/inbox.md` as fallback).

## Phase 3: Update Project Instructions

Detect `revise-claude-md` using the [detection procedure](../../docs/detecting-optional-skills.md), checking both plugin-prefixed and bare forms. If found via any signal, use the detected invocation form. Otherwise, review the session for learnings and propose CLAUDE.md updates directly — ask for approval before making changes.

Also check for and offer to update:
- `AGENTS.md` — if it exists, sync any new conventions, commands, or architecture changes discovered during the session (Codex compatibility)
- `CLAUDE.local.md` — if it exists, check if any local-only items should be promoted to CLAUDE.md

## Phase 4: Update Project Context

Check each of these for staleness and update as needed. Read the current state of each file before deciding whether changes are necessary — don't update files that are already accurate.

### Work Item State (if an active item was identified in Phase 0)
- **Plan task completion** — For each plan task finished this session, call `set_subtask_state(id, ref, done)`. Task `ref` is the leading token from the plan (e.g., `1.2`).
- **Status transition** — If the item's work is complete for this session, call `set_status(id, <canonical>)` to advance it (e.g., `in-review` when ready for review, `done` when fully complete). Use the canonical status vocabulary only.

### Context Files (`.maestro/context/`)
- Read any context files under `.maestro/context/` that are relevant to this session's work (e.g., `product.md`, `tech-stack.md`, `workflow.md`, `guidelines.md`).
- Update them if this session surfaced new facts, decisions, or patterns that belong in persistent context.

### Memory Files (if memory system exists)
- Check if anything learned this session should be saved to memory (new patterns, user preferences, project facts). Follow the memory system's rules for what qualifies.

### Other Context Files
- Any project-specific context files referenced in CLAUDE.md that may have gone stale.

Be conservative — only update what actually changed. Don't rewrite files for style.

## Phase 5: Commit

This step handles any git setup (monorepo, submodules, simple repo).

1. **Detect git structure** — Check for submodules (`git submodule status`), worktrees, or nested repos.

2. **For each repo/submodule with changes:**
   a. Stage only files from the **session file list** (never `git add -A` — other work may be in progress)
   b. Don't stage pre-existing changes that were dirty before the session started
   c. Draft a commit message summarizing the session's work
   d. Show the user the staged changes and proposed message
   e. Commit only after user approval

3. **For submodule parents:** After committing inside submodules, update the submodule pointer in the parent repo (`git add <submodule-path>`) and commit that too.

4. Do NOT push unless the user explicitly asks.

## Completion

End with a brief summary:
- What the reviewers found (and what was fixed)
- Follow-ups captured
- Context files updated
- Work item state updated (subtasks marked done, status transitions)
- Commits made (repo, message, files)
