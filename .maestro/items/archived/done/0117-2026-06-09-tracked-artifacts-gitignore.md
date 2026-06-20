---
id: 0117-2026-06-09-tracked-artifacts-gitignore
title: 2026-06-09-tracked-artifacts-gitignore
type: chore
priority: P2
status: done
weight: light
created: 2026-06-09
updated: 2026-06-09
---

# 2026-06-09-tracked-artifacts-gitignore

# Issue: Remove tracked personal artifacts and add a .gitignore

## Summary

The repo tracks ~800 KB of personal review artifacts, a node_modules symlink to an absolute home-directory path (dangling on every other machine), and the author's `.claude/settings.local.json` — all of which ship to every plugin installer. The repo has no .gitignore.

## Problem Description

Tracked in git: seven slide PNGs (~755 KB) under `tmp/slides/maestro-superpowers-review/`, a 38 KB .pptx and narrative_plan.md under `outputs/maestro-superpowers-review/`, a 20 KB builder.mjs, `tmp/slides/maestro-superpowers-review/node_modules` (a symlink to `/Users/popeoliv/.cache/codex-runtimes/...`), and `.claude/settings.local.json` containing a personal permission allowlist. Every install downloads all of it, and the dangling symlink can break tooling that scans the repo. An untracked `.DS_Store` sits in the root.

## Acceptance Criteria

- [ ] `git rm -r --cached tmp outputs .claude/settings.local.json` (keep or delete locally as preferred)
- [ ] Root .gitignore covers: `tmp/`, `outputs/`, `.DS_Store`, `node_modules/`, `.claude/settings.local.json`
- [ ] `git ls-files` shows no generated artifacts or personal settings

## Technical Context

### Affected Files

- tmp/slides/maestro-superpowers-review/ (all contents, including the node_modules symlink)
- outputs/maestro-superpowers-review/
- .claude/settings.local.json
- .gitignore (new)

### Related Tests

### Similar Patterns

## Dependencies

## Out of Scope

Curating review artifacts into docs/ — decide separately whether any are worth keeping.

## Notes

Found by the 2026-06-09 cross-LLM review; confirmed by adversarial verification.

## Notes

> Migrated from issue `2026-06-09-tracked-artifacts-gitignore.md`.
