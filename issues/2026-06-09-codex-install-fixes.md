---
status: triaged
type: bug
priority: P3
filed: 2026-06-09
---

# Issue: codex/INSTALL.md manual install fails on fresh machines; .mcp.json claim is false

## Summary

The manual install loop symlinks into `~/.agents/skills/` without creating it first, so on a fresh machine every `ln -s` fails — or worse, creates a symlink named `skills` pointing at the first skill. Line 10 also describes a `.mcp.json` packaging path that does not exist in this repo.

## Problem Description

The "Install manually (user-scoped, global)" snippet (INSTALL.md:50-61) runs `ln -s "$skill" "$HOME/.agents/skills/$name"` in a loop with no `mkdir -p`. If `~/.agents` exists but `skills/` does not, the first ln creates a symlink named `skills` and subsequent links land inside that skill directory — a broken install a weaker model executes verbatim without noticing. Separately, line 10's claim that plugin-bundled MCP servers are "packaged via `.mcp.json` and referenced from `.codex-plugin/plugin.json`" describes files that do not exist here.

## Acceptance Criteria

- [ ] `mkdir -p "$HOME/.agents/skills"` precedes the for-loop
- [ ] The .mcp.json sentence is removed or rewritten to describe actual packaging

## Technical Context

### Affected Files

- codex/INSTALL.md:10,50-61

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review.
