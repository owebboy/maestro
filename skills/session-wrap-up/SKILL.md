---
name: session-wrap-up
description: End-of-session wrap-up that reviews code quality, checks for untracked issues, updates AGENTS.md and project context files, and commits. Use when finishing a session or when the user says they're done for now.
---

# Session Wrap-Up

Run this at the end of a Codex session to close out cleanly. The goal is to leave the codebase, documentation, and project metadata in a state where a future session can pick up seamlessly.

## Phase 0: Determine Session Scope

Use the conversation history to determine the session file list. Only review, stage, or commit files that were changed in this session.

## Phase 1: Quality Review

Review only the session file list.

- Detect `simplify` using the Codex detection procedure in [docs/detecting-optional-skills.md](../../docs/detecting-optional-skills.md). If available, use it. Otherwise review for unnecessary complexity, duplication, dead code, and correctness issues inline.
- If `conductor/` exists and a track was active this session, compare session changes to the active track spec and plan.
- File issues outside the session scope to `issues/INBOX.md` instead of fixing them.

## Phase 2: Issue Capture

Ask the user whether any issues, bugs, TODOs, or out-of-scope items from the session still need to be captured. Add confirmed items to `issues/INBOX.md`.

## Phase 3: Update Project Instructions

Review the session for lasting project guidance changes.

- Update `AGENTS.md` if conventions, commands, or architecture notes changed.
- Do not depend on legacy project-doc fallbacks on this branch.

## Phase 4: Update Project Context

When relevant, update:

- active track spec/plan state
- `conductor/tracks.md`
- `conductor/index.md`
- other project context files actually changed by the session

Be conservative. Update only what became stale.

## Phase 5: Commit

1. Detect git structure.
2. Stage only files from the session file list.
3. Draft a commit message summarizing the session's work.
4. Show the user the staged changes and message.
5. Commit only after approval.

Do not push unless the user explicitly asks.

## Completion

End with:

- what the review found
- issues captured to INBOX
- context files updated
- commits made
