# Codex Installation

Maestro is Codex-only on this branch. It preserves the existing Maestro workflow and artifact formats while removing legacy dual-runtime packaging and runtime assumptions.

## Install via skills.sh

```bash
# Maestro
bunx skills add owebboy/maestro --agent codex

# Recommended dependencies
bunx skills add obra/superpowers --agent codex
bunx skills add obra/elements-of-style --agent codex
```

## Install via setup-project

```bash
# From the maestro directory:
./bin/setup-project /path/to/your/project

# Also link Superpowers if it exists in ~/.codex/superpowers/skills
./bin/setup-project --with-superpowers /path/to/your/project
```

This links Maestro skills into `.agents/skills/` and copies the Codex-compatible session-start hook into `.agents/hooks/`.

## Manual install

```bash
git clone https://github.com/owebboy/maestro.git ~/.codex/maestro

for skill in ~/.codex/maestro/skills/*/; do
  name="$(basename "$skill")"
  ln -s "$skill" "$HOME/.agents/skills/$name"
done
```

## Configuration

Add to `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

## Skill Compatibility

| Skill | Codex Support | Notes |
|-------|--------------|-------|
| setup | Full | Interactive Q&A, creates markdown files |
| new-track | Full | Uses Superpowers when available, otherwise falls back inline |
| implement | Full | Uses Superpowers when available, otherwise falls back inline |
| status | Full | Reads markdown files |
| manage | Full | File operations + git |
| triage | Full | Pure markdown workflow |
| issue-review | Full | Benefits from `multi_agent = true` |
| issue-advance | Full | Calls `new-track` workflow |
| issue-close | Full | Pure markdown workflow |
| codebase-review | Full | Benefits from `multi_agent = true` |
| uat-create | Partial | Validation helpers vary by available tools |
| uat-run | Partial | Falls back to manual verification when needed |
| session-wrap-up | Full | Updates AGENTS/project context in Codex terms |

## Runtime Contract

Maestro uses Codex-visible signals only:

1. skills visible in the current session
2. project-scoped `.agents/skills/`
3. documented Codex-local installs such as `~/.codex/superpowers/skills`
4. inline fallback

See [docs/codex-runtime-contract.md](../docs/codex-runtime-contract.md).
