---
name: session-wrap-up
description: End-of-session wrap-up that reviews code quality, checks for untracked issues, updates CLAUDE.md and project context files, and commits. Use when finishing a Claude session, wrapping up work, or the user says they're done for now.
---

# Session Wrap-Up

Run this at the end of a Claude Code session to close out cleanly. The goal is to leave the codebase, documentation, and project metadata in a state where a future session (or another developer) can pick up seamlessly.

## Phase 0: Determine Session Scope

Before any review, establish exactly which files this session touched. Do NOT rely on `git diff` or `git status` alone — those include pre-existing changes from before the session started.

**The session scope is determined by reviewing your conversation history:**
1. List every file you created, edited, or wrote during this conversation
2. This is the **session file list** — all reviews and commits are scoped to ONLY these files
3. If `git status` shows changes to files NOT in your session file list, those are pre-existing — ignore them entirely (do not review, do not commit, do not fix)

## Phase 1: Parallel Quality Review

Launch three agents in parallel. Pass each agent the **session file list** explicitly. Do NOT tell them to use `git diff HEAD` — give them the specific file paths.

### Agent 1 — Code Simplifier
If the `simplify` skill is available, use it. Pass it the session file list so it only reviews files from this session. Otherwise, launch a general-purpose agent that reviews for unnecessary complexity, duplication, and dead code.

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
Only run this agent if a `conductor/` directory exists with active tracks.

To determine which track to review: check your conversation history for which track was being implemented this session (e.g., `/implement` was invoked with a track ID, or files under `conductor/tracks/{trackId}/` were read). If unclear, check metadata.json files for the most recently updated `[~]` track. If no track was active this session, skip this agent.

> Read conductor/tracks/{trackId}/spec.md and plan.md for the track that was active this session. Then read ONLY the files from this session: [session file list]. Compare and report:
> - Spec items that were implemented but diverged from the spec
> - Spec items that were not implemented (gaps)
> - Implementation work that wasn't in the spec (scope creep)
> - Plan tasks that should be marked complete but aren't
>
> If no active conductor track was worked on this session, skip this review and say so.

Wait for all agents to complete. Apply any fixes from the code reviewer that are critical or warning severity (ask before applying nits). Report a brief summary of all reviews.

**CRITICAL: If a reviewer flags issues in files outside the session file list, discard those findings. File issues to INBOX instead of fixing them — they belong to a different session's work.**

## Phase 2: Issue Capture

Two things happen here:

1. **Ask the user directly:** "Were there any issues, bugs, TODOs, or out-of-scope items that came up during this session that haven't been addressed or added to the issue inbox?"

2. **Scan the conversation** for unresolved items — look for phrases like "TODO", "we should", "out of scope", "later", "hack", "workaround", "skip for now", or anything that sounds like deferred work. Present any findings to the user for confirmation.

For each confirmed item, append it as a bullet to `issues/INBOX.md` under the `## Inbox` heading. If `issues/INBOX.md` does not exist, create the full issues directory structure and INBOX.md template (same as `/triage` bootstrap — see that skill for the exact template). Use the format: `- <brief description of the issue>`.

## Phase 3: Update Project Instructions

If the `claude-md-management:revise-claude-md` skill is available, invoke it. Otherwise, review the session for learnings and propose CLAUDE.md updates directly — ask for approval before making changes.

Also check for and offer to update:
- `AGENTS.md` — if it exists, sync any new conventions, commands, or architecture changes discovered during the session (Codex compatibility)
- `CLAUDE.local.md` — if it exists, check if any local-only items should be promoted to CLAUDE.md

## Phase 4: Update Project Context

Check each of these for staleness and update as needed. Read the current state of each file before deciding whether changes are necessary — don't update files that are already accurate.

### Conductor Files (if conductor/ exists)
- **Active track spec/plan** — Mark completed tasks/phases. Update status fields.
- **conductor/tracks.md** — Update track status and progress notes.
- **conductor/index.md** — Ensure links and summaries reflect current state.

### Memory Files (if memory system exists)
- Check if anything learned this session should be saved to memory (new patterns, user preferences, project facts). Follow the memory system's rules for what qualifies.

### Other Context Files
- Any project-specific context files referenced in CLAUDE.md that may have gone stale.

Be conservative — only update what actually changed. Don't rewrite files for style.

## Phase 5: Commit

This step handles any git setup (monorepo, submodules, simple repo).

1. **Detect git structure** — Check for submodules (`git submodule status`), worktrees, or nested repos.

2. **For each repo/submodule with changes:**
   a. Stage ONLY files from the **session file list** (never `git add -A` — other work may be in progress)
   b. Do NOT stage pre-existing changes that were dirty before the session started
   c. Draft a commit message summarizing the session's work
   d. Show the user the staged changes and proposed message
   e. Commit only after user approval

3. **For submodule parents:** After committing inside submodules, update the submodule pointer in the parent repo (`git add <submodule-path>`) and commit that too.

4. Do NOT push unless the user explicitly asks.

## Completion

End with a brief summary:
- What the reviewers found (and what was fixed)
- Issues captured to INBOX
- Context files updated
- Commits made (repo, message, files)
