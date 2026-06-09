# Tech Stack

## Primary Languages

- **Markdown** — skill definitions (`skills/*/SKILL.md`), templates, docs. The core authoring language.
- **Bash** — tooling and installers (`bin/setup-project`, `bin/hooks/`, `hooks/`).
- **JSON** — plugin manifests and marketplace metadata.
- **Python** — used only for validation (`python3 -m json.tool`), not application logic.

## Frontend / Backend / Database

None. Maestro is a workflow plugin, not a runtime application — no frontend framework, backend service, or database.

## Distribution & Infrastructure

Maestro ships as a plugin for two harnesses from one source tree:

- **Claude Code** — `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (marketplace `maestro-dev`).
- **Codex** — `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` (points at repo root `./`).
- **skills.sh** — `bunx skills add owebboy/maestro` for Codex/global installs.
- **Project-scoped** — `bin/setup-project` installs into another repo via symlinks or portable copies, plus hooks.

## Key Layout

- `skills/` — source of truth for workflow behavior.
- `templates/` — generated Markdown templates used by skills.
- `bin/`, `hooks/`, `bin/hooks/` — install tooling and harness hook assets.
- `codex/INSTALL.md` — Codex-specific install, compatibility, and behavior notes.

## Dependencies

- **[Superpowers](https://github.com/obra/superpowers)** — required execution engine (brainstorming, planning, TDD, subagent-driven development).
- **elements-of-style**, **code-simplifier**, **claude-md-management** — recommended companion plugins.

## Validation Commands

```bash
bash -n bin/setup-project
python3 -m json.tool .claude-plugin/plugin.json >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```
