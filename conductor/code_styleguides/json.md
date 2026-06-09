# JSON Style Guide

JSON holds plugin manifests and marketplace metadata (`.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`).

## Formatting

- 2-space indentation, no trailing commas (standard JSON).
- Keys in a stable, meaningful order (`name`, `version`, `description`, then the rest).
- One file per manifest; no comments (JSON has none — put rationale in `AGENTS.md` or docs).

## Cross-harness alignment

- Keep `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` aligned on `version`, `description`, and `repository` unless a harness-specific reason to diverge is documented.
- Keep `.agents/plugins/marketplace.json` pointing at the repo-root plugin path (`./`).
- Bump versions together when shipping a release.

## Validation

Every manifest must parse cleanly — this is the verification gate:

```bash
python3 -m json.tool .claude-plugin/plugin.json >/dev/null
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```
