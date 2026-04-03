---
name: uat-run
description: Walks through a UAT checklist as an interactive proctor, runs validations, captures failures to issues/INBOX.md, and updates the checklist. Use when running acceptance tests
argument-hint: "[UAT-file-path | date]"
---

# UAT Run

Interactive proctor for walking through a UAT checklist. Runs pre-checks, guides manual testing section by section, captures failures as INBOX issues.

## Arguments

Optional: UAT file path or date (e.g., `2026-03-11`). If omitted, uses the most recent `conductor/UAT-*.md`.

## Process

### 1. Load

- Read the target `conductor/UAT-YYYY-MM-DD.md`
- Parse all sections, test items, and their current status (`[ ]`, `[x]`, `[!]`, `[-]`)
- Identify incomplete items (skip already-passed `[x]` sections unless user requests re-test)
- Check prerequisites — warn if any are unmet

### 2. Validation Pre-Scan

- Find all validation blocks in the checklist (SQL queries, shell commands, manual steps)
- Run automated validations using available tools:
  - Database MCP tools: execute SQL queries
  - Bash: run shell commands or test suites
  - If no automated tools are available, skip pre-scan and proceed to manual walkthrough
- Record results keyed by section number
- For tests that are fully verifiable by automated results, pre-fill the result
- For tests that need manual verification, note the automated result as supporting evidence

### 3. Walk Through Sections

Present one section at a time:

```
## Section N: Title

Automated pre-check results:
  - Query/Command 1: [result summary — PASS or unexpected value]

Pre-filled from automation:
  - [x] N.1 — description (verified: returned expected value)

Needs manual verification:
  - [ ] N.2 — description
  - [ ] N.3 — description

How did these go?
```

**Adapt granularity:**
- If a section has many tests or complex setup, break into subsections
- If a section is straightforward (2-3 simple tests), present together
- If automation pre-filled everything in a section, report it and move on unless user objects
- If a section is marked `**Blocked by:**` an unmet prerequisite, skip it and mark items `[-]`

### 4. Capture Failures

When user reports a failure:

1. Ask for the symptom (what happened vs what was expected)
2. If automated tools are available, run diagnostic queries/commands to gather context
3. Draft an INBOX bullet:
   ```
   - <description of failure with specific test reference> (type: <inferred>, priority: <inferred>)
   ```
4. Show the draft and ask for confirmation before appending to `issues/INBOX.md`

**Type inference:** visual/UI issue -> bug; data mismatch -> bug; missing feature -> feature
**Priority inference:** blocks core workflow -> P1; incorrect results -> P2; cosmetic/minor -> P3

### 5. Update Checklist

After each section:
- Mark items: `[x]` pass, `[!]` fail (append failure note), `[-]` blocked
- For failures, add inline note: `[!] **N.M — Test name:** FAIL — <brief reason>`
- Update the Results Summary table with pass/fail/blocked counts

### 6. Summary

After all sections:

```
UAT Complete: YYYY-MM-DD

Results: X pass, Y fail, Z blocked out of N total
- Section A: all pass
- Section B: 2 fail (B.3, B.5)
- Section C: blocked (deployment)

New INBOX items: M
- <bullet 1 summary>
- <bullet 2 summary>
```

## Rules

- **Read-only validations** — never run destructive commands (INSERT/UPDATE/DELETE, rm, etc.) during UAT
- **Don't assume** — if an automated result is ambiguous, ask the user rather than auto-marking pass
- **Preserve existing marks** — don't overwrite `[x]` items from prior runs unless user explicitly asks to re-test
- **One section at a time** — wait for user input before advancing to the next section
- **INBOX bullets need confirmation** — always show the draft before appending
