# AGENTS.md

## Overview

Maestro is a cross-harness workflow package for Claude Code and Codex. The repository ships shared skill sources under `skills/`, Claude packaging under `.claude-plugin/`, and Codex packaging under `.codex-plugin/` plus `.agents/plugins/marketplace.json`.

## Repo Map

- `skills/`: source of truth for workflow behavior. Keep `SKILL.md` frontmatter and any `agents/openai.yaml` metadata aligned.
- `bin/setup-project`: installs Maestro into another repository via project-scoped symlinks and hooks.
- `codex/INSTALL.md`: Codex-specific install, compatibility, and behavior notes.
- `templates/`: generated markdown templates used by the skills.
- `bin/hooks/` and `hooks/`: hook assets for Claude Code and Codex installs.

## Edit Rules

- Keep `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` aligned on version, description, and repository metadata unless there is a harness-specific reason to diverge.
- Keep `.agents/plugins/marketplace.json` pointing at the repo-root plugin path (`./`).
- Prefer improving shared `skills/` content instead of creating Codex-only forks.
- When adding, renaming, or re-scoping a skill, update `README.md`, `codex/INSTALL.md`, `bin/setup-project`, and that skill's `agents/openai.yaml`.
- When writing subagent instructions, be explicit about when Codex should use `explorer` for read-heavy work versus `worker` for implementation.

## Validation

```bash
bash -n bin/setup-project
python3 -m json.tool .claude-plugin/plugin.json >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```

## Codex Notes

- Codex reads `SKILL.md` frontmatter plus optional `agents/openai.yaml` metadata for skill discovery.
- Current Codex releases enable subagents by default; use `[agents]` config only when you need different thread or depth limits.
- Use `allow_implicit_invocation: false` for routing-only, destructive, or session-finalizing skills.
