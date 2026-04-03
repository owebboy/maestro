---
name: issue-advance
description: Converts a reviewed issue into a conductor track, creating the track from issue data and archiving the issue file. Use when a reviewed issue is ready for implementation, or "all" to batch-advance.
argument-hint: "<issue-file-path> | all"
---

# Issue Advance

Convert a reviewed issue file into a conductor track.

**Argument:** path to issue file (e.g., `issues/2026-02-24-timer-pause.md`) or `all` to batch-advance all reviewed issues

## Pre-flight

1. **Read** the issue file(s)
   - Verify frontmatter `status` is `reviewed`
   - If status is `triaged` — suggest running `/issue-review` first

2. **Verify project** is initialized:
   - Check that `conductor/` directory exists with `product.md` (or `product-guidelines.md`) and `workflow.md`
   - If not found — tell the user: "Project is not initialized. Run `/setup` first."
   - Stop if not initialized

3. **Batch mode** (`all` argument):
   - Scan `issues/*.md` for files with frontmatter `status: reviewed`
   - Sort by priority (P1 first, then P2, then P3) so blocking issues are advanced first
   - Present the sorted list and ask user to confirm which to advance
   - Group related issues into fewer tracks where they address the same subsystem — ask user before grouping

## Process (per issue)

4. **Invoke** `/new-track` using the Skill tool:
   - Pass the issue type and Summary as the argument (e.g., `bug fix timer pause`)
   - **IMPORTANT:** When new-track asks interactive questions, YOU answer them immediately using the issue file data — do NOT re-ask the user. Present each answer for user confirmation.

   | new-track Question | Answer from Issue Field |
   |-------------------|----------------------|
   | Track type? | **Type** (bug/feature/refactor/chore) |
   | Summary? | **Summary** |
   | Steps to reproduce / User story? | **Problem Description** |
   | Acceptance criteria? | **Acceptance Criteria** |
   | Dependencies? | **Dependencies** section |
   | Out of scope? | **Out of Scope** section |
   | Technical considerations? | **Technical Context** (filled by /issue-review) |

   - When new-track shows spec for review — verify it accurately captures the issue
   - When brainstorming/planning begins — provide design context from the issue's Technical Context section
   - When plan is shown for review — approve if reasonable

5. **Archive the issue** after track creation succeeds:
   - Add to frontmatter: `advanced-to: <track-id>`
   - Update frontmatter `status` to `tracked`
   - Move file to `issues/archived/tracked/`
   - Create `issues/archived/tracked/` directory if it doesn't exist

6. **Confirm** — display track ID, location, and next steps

## Error Handling

- **`/new-track` fails partway**: If track creation fails after spec generation but before plan completion, report the partial state. The user can resume with `/new-track` using the existing spec, or delete the partial track directory and retry.
- **Issue data incomplete**: If the issue file is missing sections that `/new-track` needs (e.g., no Acceptance Criteria), fill with reasonable defaults from the Summary and flag to the user for confirmation.
- **Archive directory missing**: Create `issues/archived/tracked/` if it doesn't exist before moving.
- **Batch mode conflict**: If two reviewed issues appear to cover the same problem, ask the user whether to group them into one track or create separate tracks.
