---
name: codebase-review
description: Performs a full codebase review using parallel review agents (security, performance, architecture, testing, data-integrity, UX), then parallel audit agents to verify findings. Results go to issues/INBOX.md. Use when a comprehensive codebase health check is needed.
disable-model-invocation: true
argument-hint: "[scope — e.g., 'src/', 'api layer', 'recent changes']"
---

# Codebase Review

Full codebase review using two waves of parallel agents. Tested at scale: 65 findings → 5 audit agents → 2 FP removed, 14 corrected → 18 issues → 9 tracks.

**Argument:** optional scope constraint (directory, layer, or "recent changes"). Default: entire codebase.

## Progress Checklist

Copy this checklist and track your progress:

```
Codebase Review Progress:
- [ ] Phase 1: Launch 6 review agents (security, perf, arch, testing, data, UX)
- [ ] Phase 2: Launch audit agents (one per review agent with findings)
- [ ] Phase 3: Consolidate — remove FPs, correct partial findings, present table
- [ ] Phase 4: File confirmed findings to INBOX.md
```

## Phase 1: Review Wave

Launch 6 review agents in parallel. In Claude Code, use the Agent tool with `subagent_type=Explore`. In Codex, spawn 6 `explorer` agents explicitly for the read-heavy review wave. Each agent has a specific focus area and produces findings as a numbered list.

**Agent 1 — Security:**
> Review {scope} for security issues. Check for: injection vulnerabilities (SQL, command, XSS), authentication/authorization gaps, secrets in code, insecure deserialization, SSRF, path traversal, timing attacks, missing input validation at system boundaries. For each finding: file, line, severity (critical/high/medium/low), description, suggested fix.

**Agent 2 — Performance:**
> Review {scope} for performance issues. Check for: N+1 queries, missing indexes, unbounded queries, unnecessary re-renders, memory leaks, missing pagination, expensive operations in hot paths, missing caching opportunities. For each finding: file, line, severity, description, suggested fix.

**Agent 3 — Architecture:**
> Review {scope} for architecture issues. Check for: layer violations, circular dependencies, god classes/functions, missing abstractions, inconsistent patterns, violation of project conventions (check CLAUDE.md or AGENTS.md), dead code, orphaned files. For each finding: file, line, severity, description, suggested fix.

**Agent 4 — Testing:**
> Review {scope} for testing gaps. Check for: untested public functions, missing edge case tests, flaky test patterns (time-dependent, ordering-dependent), test isolation issues, missing integration tests for critical paths, tests that don't assert meaningful behavior. For each finding: file, line, severity, description, suggested fix.

**Agent 5 — Data Integrity:**
> Review {scope} for data integrity issues. Check for: race conditions, missing transactions, inconsistent state updates, missing validation on data mutations, silent data corruption risks, missing audit trails for important operations, schema drift. For each finding: file, line, severity, description, suggested fix.

**Agent 6 — Client/UX (if applicable):**
> Review {scope} for client-side and UX issues. Check for: accessibility gaps, broken responsive layouts, missing loading/error states, inconsistent UI patterns, unhandled edge cases in user flows, missing keyboard navigation. If no client-side code exists, report "N/A — no client code in scope." For each finding: file, line, severity, description, suggested fix.

Collect all findings into a consolidated list, deduplicating across agents.

## Phase 2: Audit Wave

Launch audit agents in parallel — one per review agent that produced findings. Skip agents that found nothing.

Each audit agent receives the findings from its corresponding review agent:

> You are auditing {focus area} findings from a codebase review. For each finding below, verify it against the actual code. Classify as:
> - **CONFIRMED** — the finding is accurate and actionable
> - **PARTIALLY CORRECT** — the finding identifies a real issue but the description or severity is wrong. Provide correction.
> - **FALSE POSITIVE** — the finding is incorrect. Explain why.
>
> Findings to audit:
> {findings list}

## Phase 3: Consolidate

1. Remove all FALSE POSITIVE findings
2. Update PARTIALLY CORRECT findings with corrections
3. Keep all CONFIRMED findings as-is
4. Present the final verified findings to the user with a summary table:

   | # | Area | Severity | File | Description | Verdict |
   |---|------|----------|------|-------------|---------|

5. Ask user to confirm which findings should be added to INBOX

## Phase 4: File to INBOX

For each confirmed finding, append a bullet to `issues/INBOX.md`:

```
- **<brief description>.** <details>. <severity> priority. Source: codebase-review_YYYYMMDD.
```

If `issues/INBOX.md` does not exist, create the full issues directory structure and INBOX.md template (same as `/triage` bootstrap — see that skill for the exact template), then append findings.

Suggest running `/triage` next to process the new INBOX items.
