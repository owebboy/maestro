---
name: issue-review
description: Enriches a triaged issue file with technical context from codebase exploration, or scopes vague issues via brainstorming. Use when a triaged issue needs codebase context before implementation
argument-hint: "<issue-file-path> | all"
---

# Issue Review

Fill technical context in a triaged issue file by exploring the codebase.

**Argument:** path to issue file (e.g., `issues/2026-02-24-timer-pause.md`) or `all` to batch-review all triaged issues

## Process

1. **Read** the issue file(s)
   - If argument is `all`: scan `issues/*.md` for files with frontmatter `status: triaged`, sort by priority (P1 first), and process each sequentially through steps 2–6
   - Verify frontmatter `status` is `triaged` (or `reviewed` for re-review)
   - Extract Summary, Problem Description, and Acceptance Criteria

2. **Assess clarity** — does the issue have:
   - Specific, searchable problem description?
   - At least one concrete acceptance criterion?
   - If NO to either:
     - Check if `superpowers:brainstorming` (plugin-installed) or `brainstorming` (project-scoped) skill is available. If found, invoke it to scope the issue with the user.
     - Otherwise, run an inline brainstorming discussion: ask the user to clarify the problem, propose possible causes, and refine acceptance criteria
     - Update the issue file with the refined content, then continue

3. **Explore codebase** — launch 3 parallel agents. In Claude Code, use the Agent tool with `subagent_type=Explore`. In Codex, spawn 3 worker agents explicitly.

   **Agent 1 — Affected Files:**
   > Find source files related to: "{summary}". Search for relevant keywords, types, functions. List file paths with brief relevance notes.

   **Agent 2 — Related Tests:**
   > Find existing tests related to: "{summary}". Check test directories for coverage of the affected area. Note gaps.

   **Agent 3 — Similar Patterns:**
   > Search for prior work related to: "{summary}". Check git log for related commits. Check conductor/tracks/ for related or completed tracks (if conductor/ exists).

4. **Update issue file** in place:
   - Fill `### Affected Files` with Agent 1 findings
   - Fill `### Related Tests` with Agent 2 findings
   - Fill `### Similar Patterns` with Agent 3 findings
   - Update `## Dependencies` if agents found any
   - Refine `## Acceptance Criteria` if exploration revealed new requirements
   - Update frontmatter `status` to `reviewed`

5. **Polish writing** — check if `elements-of-style:writing-clearly-and-concisely` (plugin-installed) or `writing-clearly-and-concisely` (project-scoped) skill is available.
   - If found, invoke it against the issue file to tighten the Summary, Problem Description, and Acceptance Criteria
   - If not available, do a quick inline pass: remove filler words, prefer active voice, ensure each acceptance criterion is a single testable statement
   - Do not change technical meaning — only improve clarity

6. **Display summary** of findings for user review
