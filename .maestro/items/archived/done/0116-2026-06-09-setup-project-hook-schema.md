---
id: 0116-2026-06-09-setup-project-hook-schema
title: 2026-06-09-setup-project-hook-schema
type: bug
priority: P1
status: done
weight: light
created: 2026-06-09
updated: 2026-06-09
---

# 2026-06-09-setup-project-hook-schema

# Issue: setup-project writes an invalid Claude Code hook schema

## Summary

`bin/setup-project` writes `.claude/settings.json` hooks in a flat shape Claude Code rejects, so installed hooks never run despite the script reporting "hooks enabled".

## Problem Description

`write_claude_settings_with_hooks` (bin/setup-project:298-330) emits `"SessionStart": [{"command": "..."}]` and `"PostToolUse": [{"command": "...", "matcher": "Write|Edit"}]`. Claude Code's schema requires matcher groups containing a nested `hooks` array of `{"type": "command", "command": ...}` objects — the shape the plugin's own `hooks/hooks.json` already uses correctly. Claude Code ignores the flat form, so the success message is false. `print_claude_hook_snippet` (printed when settings.json already exists) propagates the same broken shape.

## Acceptance Criteria

- [ ] Generated settings.json matches the documented schema, mirroring hooks/hooks.json
- [ ] `print_claude_hook_snippet` prints the same corrected shape
- [ ] Hooks fire in a fresh project after running `./bin/setup-project`

## Technical Context

### Affected Files

- bin/setup-project:298-330 (`write_claude_settings_with_hooks`, `print_claude_hook_snippet`)
- hooks/hooks.json (reference for the correct schema)

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification.

## Notes

> Migrated from issue `2026-06-09-setup-project-hook-schema.md`.
