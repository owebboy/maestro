---
name: issue-advance
description: Use when a reviewed issue is ready to become a conductor track, or "all" to batch-advance. For a track that already has a spec and plan, use implement instead.
argument-hint: "<issue-file-path> | all"
---

# Issue Advance

Convert a reviewed issue file into a conductor track.

**Argument:** path to issue file (e.g., `issues/2026-02-24-timer-pause.md`) or `all` to batch-advance all reviewed issues

## Pre-flight

1. **Read** the issue file(s)
   - If the issue file path does not exist, inform the user and stop
   - Verify frontmatter `status` is `reviewed`
   - If status is `triaged` — suggest running `/issue-review` in Claude Code or `$issue-review` in Codex first
   - If status is anything other than `reviewed` (and not `triaged`), inform the user of the unexpected status and stop

2. **Verify project** is initialized:
   - Check that `conductor/` directory exists with `product.md` (or `product-guidelines.md`) and `workflow.md`
   - If not found — tell the user: "Project is not initialized. Run `/setup` in Claude Code or `$setup` in Codex first."
   - Stop if not initialized

3. **Batch mode** (`all` argument):
   - Scan `issues/*.md` for files with frontmatter `status: reviewed`
   - If no reviewed issues are found, inform the user and stop
   - Sort by priority (P1 first, then P2, then P3) so blocking issues are advanced first
   - Present the sorted list and ask user to confirm which to advance
   - Group related issues into fewer tracks where they address the same subsystem — ask user before grouping

## Process (per issue)

4. **Invoke** `new-track` using the harness form (`/new-track` in Claude Code, `$new-track` in Codex):
   - Pass the issue type and Summary as the argument (e.g., `bug fix timer pause`)
   - **IMPORTANT:** When new-track asks interactive questions, draft the answers yourself from the issue file data rather than re-asking the user. Present the drafted answers to the user, and once they confirm, proceed with them.

   | new-track Question | Answer from Issue Field |
   |-------------------|----------------------|
   | Track type? | **Type** (bug/feature/refactor/chore) |
   | Summary? | **Summary** |
   | Steps to reproduce / User story? | **Problem Description** |
   | Acceptance criteria? | **Acceptance Criteria** |
   | Dependencies? | **Dependencies** section |
   | Out of scope? | **Out of Scope** section |
   | Technical considerations? | **Technical Context** (filled by `/issue-review` in Claude Code or `$issue-review` in Codex) |

   - When new-track shows spec for review — verify it accurately captures the issue
   - When brainstorming/planning begins — provide design context from the issue's Technical Context section
   - When plan is shown for review — approve if reasonable

5. **Archive the issue** after track creation succeeds:
   - Add to frontmatter: `advanced-to: <track-id>` — the `<track-id>` is the id created by `new-track` in the previous step
   - Update frontmatter `status` to `tracked`
   - Move file to `issues/archived/tracked/`
   - Create `issues/archived/tracked/` directory if it doesn't exist

6. **Confirm** — display track ID, location, and next steps

## Error Handling

- **`new-track` fails partway**: If track creation fails after spec generation but before plan completion, report the partial state. The user can resume with `/new-track` in Claude Code or `$new-track` in Codex using the existing spec, or delete the partial track directory and retry.
- **Issue data incomplete**: If the issue file is missing sections that `new-track` needs (e.g., no Acceptance Criteria), fill with reasonable defaults from the Summary and flag to the user for confirmation.
- **Archive directory missing**: Create `issues/archived/tracked/` if it doesn't exist before moving.
- **Batch mode conflict**: If two reviewed issues appear to cover the same problem, ask the user whether to group them into one track or create separate tracks.
