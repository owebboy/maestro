---
name: issue-review
description: Use when a triaged work item needs codebase context or scoping before implementation, or "all" to batch-review triaged items.
argument-hint: "<item-ref> | all"
---

# Issue Review

Fill technical context in a triaged work item by exploring the codebase.

**Argument:** a loose ref (id, slug, or path) for a single item, or `all` to batch-review all triaged items.

## Process

1. **Load** the item(s)
   - If argument is `all`: call `list_items({status: triaged})`, sort results by priority (P1 first), and process each sequentially through steps 2–6. If no triaged items are returned, inform the user and stop.
   - Otherwise: call `get_item(<ref>)` to resolve the loose ref. If the item is not found, inform the user and stop.
   - Verify the item's `status` is `triaged` (or `reviewed` for re-review). If the status is anything else, inform the user and stop.
   - Extract `title`, Summary, Problem Description, and Acceptance Criteria from the item body.

2. **Assess clarity** — does the item have:
   - Specific, searchable problem description?
   - At least one concrete acceptance criterion?
   - If NO to either:
     - Detect `brainstorming` using the [detection procedure](../../docs/detecting-optional-skills.md), checking both plugin-prefixed and bare forms. If found via any signal, use the detected invocation form to scope the item with the user.
     - Otherwise, run an inline brainstorming discussion: ask the user to clarify the problem, propose possible causes, and refine acceptance criteria.
     - Build the updated body with refined content, then call `update_item(id, { body })` to save it. Continue to step 3.

3. **Explore codebase** — launch 3 parallel agents. In Claude Code, use the Agent tool with `subagent_type=Explore`. In Codex, spawn 3 `explorer` agents explicitly because this step is read-heavy. If your harness cannot spawn subagents (e.g. Gemini CLI, Copilot CLI, or plain chat), do this work yourself sequentially, using each agent's brief above as a checklist.

   **Agent 1 — Affected Files:**
   > Find source files related to: "{title}". Search for relevant keywords, types, functions. List file paths with brief relevance notes.

   **Agent 2 — Related Tests:**
   > Find existing tests related to: "{title}". Check test directories for coverage of the affected area. Note gaps.

   **Agent 3 — Similar Patterns:**
   > Call `search("{title}")` to find related or completed work items. Also scan the codebase for prior implementations of similar patterns. Report relevant matches.

4. **Enrich item body** — build the enriched body: fill `### Affected Files` with Agent 1 findings; fill `### Related Tests` with Agent 2 findings; fill `### Similar Patterns` with Agent 3 findings; update `## Dependencies` if agents found any; refine `## Acceptance Criteria` if exploration revealed new requirements.

5. **Polish writing** — detect `writing-clearly-and-concisely` using the [detection procedure](../../docs/detecting-optional-skills.md), checking both plugin-prefixed and bare forms.
   - If found, invoke it against the enriched body to tighten the Summary, Problem Description, and Acceptance Criteria.
   - If not available, do a quick inline pass: remove filler words, prefer active voice, ensure each acceptance criterion is a single testable statement.
   - Do not change technical meaning — only improve clarity.
   - Call `update_item(id, { body })` with the polished body.
   - Call `set_status(id, reviewed)`.

6. **Display summary** of findings for user review. For each item reviewed, print one row:

   | ID | Affected Files | Tests | Status |
   |----|----------------|-------|--------|
   | 0042-user-auth | 3 files | 1 test, gaps noted | reviewed |
