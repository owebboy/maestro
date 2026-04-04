# Codex Installation

Maestro skills are compatible with OpenAI Codex via the shared Agent Skills format. Track management is built in — no Conductor dependency.

## Install via skills.sh (recommended)

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
./bin/setup-project --codex /path/to/your/project

# With Superpowers (recommended — powers brainstorming + planning + TDD):
./bin/setup-project --codex --with-superpowers /path/to/your/project

# Both harnesses at once:
./bin/setup-project --both --with-superpowers /path/to/your/project
```

This symlinks skills into your project's `.agents/skills/` directory where Codex discovers them automatically. Claude-only skills (workflow-router, agents-md-sync) are skipped.

## Install manually (user-scoped, global)

```bash
# Clone the plugin
git clone https://github.com/owebboy/maestro.git ~/.codex/maestro

# Symlink each skill into Codex's global skill discovery path
for skill in ~/.codex/maestro/skills/*/; do
  name="$(basename "$skill")"
  [[ "$name" == "workflow-router" || "$name" == "agents-md-sync" ]] && continue
  ln -s "$skill" "$HOME/.agents/skills/$name"
done
```

## Configuration

Add to `~/.codex/config.toml`:

```toml
[features]
multi_agent = true  # Required for issue-review, codebase-review

# Optional: teach Codex to also read CLAUDE.md files
[project]
project_doc_fallback_filenames = ["CLAUDE.md"]
```

## Skill Compatibility

| Skill | Codex Support | Notes |
|-------|--------------|-------|
| setup | Full | Interactive Q&A, creates markdown files |
| new-track | Full* | *Superpowers brainstorming/planning falls back to inline if not installed |
| implement | Full* | *Superpowers subagent-driven-dev falls back to inline TDD |
| status | Full | Reads markdown files |
| manage | Full | File operations + git |
| triage | Full | Pure markdown workflow |
| issue-review | Full | Needs `multi_agent = true` |
| issue-advance | Full | Calls `/new-track` (our own skill, not external) |
| issue-close | Full | Pure markdown workflow |
| codebase-review | Full | Needs `multi_agent = true` |
| uat-create | Partial | MCP tool detection varies |
| uat-run | Partial | Falls back to manual verification |
| session-wrap-up | Partial | Some skill invocations are Claude-only |
| workflow-router | N/A | Uses Claude-only `user-invocable: false` |
| agents-md-sync | N/A | Purpose is to generate Codex artifacts from Claude |

## Dependencies

- **Superpowers** (strongly recommended): Powers brainstorming, planning, TDD, and subagent-driven development inside `/new-track` and `/implement`. Without it, these skills fall back to inline workflows. Superpowers skills are standard SKILL.md format and fully portable to Codex.
- **No Conductor dependency**: Track management (setup, new-track, implement, status, manage) is built into Maestro.

## Differences from Claude Code

- **Agent spawning**: Codex spawns agents only when explicitly asked. Skills that dispatch parallel agents will work but require explicit invocation via `$skill-name` or `/skills`.
- **Auto-memory**: No equivalent to Claude's `~/.claude/projects/<project>/memory/`. Use `AGENTS.md` for persistent context, or build a memory process using Codex hooks/scripts.
- **MCP config**: Servers are configured in `config.toml` under `[mcp_servers.<name>]`, not `.mcp.json`.
- **Frontmatter**: Codex ignores Claude-specific frontmatter fields (`user-invocable`, `disable-model-invocation`, `context`). Skills still load — the fields are simply skipped.
- **Hooks**: Codex has hooks (experimental, `codex_hooks = true`), but only 5 events vs Claude's 26. Maestro ships 1 Codex-compatible hook (`session-start-issues.sh`) and 1 Claude-only hook (`validate-issue-frontmatter.sh` — requires PostToolUse with file path context). The setup script copies the compatible hook to `.agents/hooks/`.
- **Permissions**: Codex uses `sandbox_mode` + `approval_policy` instead of Claude's per-tool allow/ask/deny rules. Skills that reference `permissionMode` or tool-specific permissions need manual translation to Codex's sandbox/approval model.
