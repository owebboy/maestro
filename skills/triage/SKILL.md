---
name: triage
description: Processes raw issue bullets from issues/INBOX.md into structured issue files with dedup checking, type classification, and priority assignment. Use when INBOX.md has unprocessed items
argument-hint: "[issues-directory]"
---

# Triage

Parse INBOX.md bullets into structured issue files.

**Argument:** issues directory path (default: `issues/`)

## Process

1. **Bootstrap** — if `issues/` directory or `issues/INBOX.md` does not exist:
   - Create `issues/` directory
   - Create `issues/archived/{tracked,deferred,wont-fix,duplicate}/`
   - Create `issues/INBOX.md` with this content:
     ```markdown
     # Issue Inbox

     Add issues as bullet points below. Run `/triage` to process them into individual issue files.

     ## Format

     - <description>
     - <description> (type: bug, priority: P1)

     Type and priority are optional — `/triage` will infer them.

     **Types:** bug | feature | refactor | chore
     **Priorities:** P1 (blocking) | P2 (important) | P3 (nice-to-have)

     ## Inbox

     ```
   - Inform the user: "Created issues/INBOX.md. Add bullets under ## Inbox and run /triage again."
   - Stop (nothing to triage yet)

2. **Read** `issues/INBOX.md` — extract bullets under `## Inbox`
   - If no bullets found, inform user and stop

3. **Dedup** — for each bullet, check for overlap with:
   - Existing `issues/*.md` files (read their frontmatter and Summary sections)
   - **Active** conductor tracks only (check `conductor/tracks.md` for status, if conductor/ exists)
   - INBOX bullets are typically follow-ups from completed tracks or brand-new issues — completed/archived tracks are NOT duplicates
   - Only flag as duplicate if an **active** track or **open** issue already covers the same problem
   - If a genuine duplicate is found, ask user whether to skip or create anyway

4. **Classify** each bullet — infer from description, confirm with user:
   - **Type:** bug | feature | refactor | chore
   - **Priority:** P1 (blocking/critical) | P2 (important) | P3 (nice-to-have)

5. **Ensure archive directories exist**: create `issues/archived/{tracked,deferred,wont-fix,duplicate}/` if missing (needed by `/issue-advance` and `/issue-close`).

6. **Polish descriptions** — before writing issue files, tighten the expanded Summary and Problem Description for each bullet:
   - Check if `elements-of-style:writing-clearly-and-concisely` (plugin-installed) or `writing-clearly-and-concisely` (project-scoped) skill is available
   - If found, invoke it on the draft descriptions (batch all bullets in a single invocation)
   - If not available, do a quick inline pass: remove filler words, prefer active voice, keep each description to 1-2 sentences
   - Do not change technical meaning — only improve clarity

7. **Create issue file** for each bullet using the template:
   - Filename: `issues/YYYY-MM-DD-<slug>.md`
   - Slug: 2-4 lowercase hyphenated words from the description
   - Date: today

8. **Display summary table:**

   | File | Type | Priority | Summary |
   |------|------|----------|---------|
   | 2026-02-24-timer-pause.md | bug | P1 | Timer doesn't pause... |

9. **Clear processed bullets** from INBOX.md after user confirms
   - Leave the `## Inbox` header intact

## Error Handling

- **Malformed bullets**: If a bullet lacks a clear description (e.g., just a URL or single word), ask the user to clarify before creating an issue file.
- **INBOX.md has non-bullet content under ## Inbox**: Ignore non-bullet lines (paragraphs, headers, blank lines) — only process lines starting with `- `.
- **Duplicate detection uncertain**: When overlap is ambiguous (e.g., similar but not identical descriptions), present both items and let the user decide.
- **File write failure**: If an issue file can't be created, report the error and continue with remaining bullets. Do not clear any bullets from INBOX until their issue files are confirmed written.

## Issue Template

Use the template at `templates/issue-file.md` (relative to the plugin root). Fill in the `<placeholders>` with data from the inbox bullet.
