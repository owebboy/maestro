# Codex Runtime Contract

This branch assumes Codex only.

## Optional Skills

Detect optional skills in this order:

1. visible in the current session
2. project-scoped `.agents/skills/`
3. documented Codex-local install paths such as `~/.codex/superpowers/skills`
4. inline fallback

Do not read legacy plugin metadata or legacy project skill directories.

## Agent Spawning

When a skill calls for parallel agents:

- use Codex agent spawning if available
- if not available, run the same workflow sequentially and say that execution is degraded

## Hooks

Maestro assumes only Codex-compatible hooks. `session-start-issues.sh` is supported as a project hook helper. Other helper scripts may remain in the repo for manual use, but they are not part of the automatic runtime contract.

## Project Instructions

`AGENTS.md` is the primary persistent instruction artifact for Codex on this branch. Do not depend on legacy project-doc fallbacks.
