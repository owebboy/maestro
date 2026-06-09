---
status: triaged
type: chore
priority: P3
filed: 2026-06-09
---

# Issue: Codex hook support is claimed but no executing mechanism is documented

## Summary

session-start-issues.sh declares Codex compatibility and setup-project copies it to `.agents/hooks/`, but no documented Codex mechanism executes hooks from that directory — the claim may be aspirational.

## Problem Description

The hook header (bin/hooks/session-start-issues.sh:4) and setup-project's Codex path (around line 359) both assume Codex picks up `.agents/hooks/`. README:164 hedges that Codex hooks are experimental behind `codex_hooks = true`, but nothing documents how the copied script gets registered or invoked — there is no Codex equivalent of hooks.json in the repo. Users on Codex get a file copied into their project that nothing runs, and the docs imply it works.

## Acceptance Criteria

- [ ] Verify against current Codex documentation whether and how `.agents/hooks/` scripts execute
- [ ] If a registration step exists, setup-project performs or prints it; if not, README/INSTALL stop claiming the hook works on Codex and setup-project stops copying it (or labels it manual)

## Technical Context

### Affected Files

- bin/hooks/session-start-issues.sh:4
- bin/setup-project:359+
- README.md:163-164
- codex/INSTALL.md:107

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
