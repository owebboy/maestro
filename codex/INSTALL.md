# Codex Installation

Maestro now ships both shared Agent Skills content and first-class Codex plugin metadata. Track management is built in — no Conductor dependency.

## Install via the repo-local plugin

If you are working from a checkout of this repository, Maestro exposes a repo-scoped marketplace at `.agents/plugins/marketplace.json`.

1. Open this repository in Codex.
2. Restart Codex so it picks up the repo marketplace.
3. Open the plugin directory, choose `Maestro Local Plugins`, and install `maestro`.

This path uses `.codex-plugin/plugin.json`, keeps plugin metadata in one place, and matches the current Codex plugin guidance.

In Codex, invoke skills with `$setup`, `$new-track`, `$triage`, and the rest of the `$skill-name` set.

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
./bin/setup-project --codex /path/to/your/project

# With Superpowers (recommended — powers brainstorming + planning + TDD):
./bin/setup-project --codex --with-superpowers /path/to/your/project

# Both harnesses at once:
./bin/setup-project --both --with-superpowers /path/to/your/project
```

This symlinks skills into your project's `.agents/skills/` directory where Codex discovers them automatically.

## Install manually (user-scoped, global)

```bash
# Clone the plugin
git clone https://github.com/owebboy/maestro.git ~/.codex/maestro

# Symlink each skill into Codex's global skill discovery path
for skill in ~/.codex/maestro/skills/*/; do
  name="$(basename "$skill")"
  ln -s "$skill" "$HOME/.agents/skills/$name"
done
```

## Configuration

Subagents are enabled by default in current Codex releases. Add optional project-scoped config if you want predictable agent fan-out or `CLAUDE.md` fallback behavior:

```toml
[agents]
max_threads = 6
max_depth = 1

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
| issue-review | Full | Read-heavy review flow; use explicit `explorer` agents in Codex |
| issue-advance | Full | Calls the `new-track` skill (our own skill, not an external dependency) |
| issue-close | Full | Pure markdown workflow |
| codebase-review | Full | Read-heavy review flow; use explicit `explorer` agents in Codex |
| uat-create | Partial | MCP tool detection varies |
| uat-run | Partial | Falls back to manual verification |
| session-wrap-up | Partial | Some skill invocations are Claude-only |
| workflow-router | Partial | Explicit-only helper; Codex ignores Claude auto-routing frontmatter |
| agents-md-sync | Full | Generates `AGENTS.md` from `CLAUDE.md` for dual-harness repos |

## Dependencies

- **Superpowers** (strongly recommended): Powers brainstorming, planning, TDD, and subagent-driven development inside `/new-track` and `/implement`. Without it, these skills fall back to inline workflows. Superpowers skills are standard SKILL.md format and fully portable to Codex.
- **No Conductor dependency**: Track management (setup, new-track, implement, status, manage) is built into Maestro.

## Differences from Claude Code

- **Agent spawning**: Current Codex releases enable subagents by default, but Codex still only spawns them when explicitly asked. Skills that dispatch parallel agents should say which agent type to use and require explicit invocation via `$skill-name` or `/skills`.
- **Auto-memory**: No equivalent to Claude's `~/.claude/projects/<project>/memory/`. Use `AGENTS.md` for persistent context, or build a memory process using Codex hooks/scripts.
- **MCP config**: User-scoped servers still live in `config.toml` under `[mcp_servers.<name>]`, while plugin-bundled servers are packaged via `.mcp.json` and referenced from `.codex-plugin/plugin.json`.
- **Frontmatter**: Codex ignores Claude-specific frontmatter fields (`user-invocable`, `disable-model-invocation`, `context`). Skills still load — the fields are simply skipped.
- **Hooks**: Codex has hooks (experimental, `codex_hooks = true`), but only 5 events vs Claude's 26. Maestro ships 1 Codex-compatible hook (`session-start-issues.sh`) and 1 Claude-only hook (`validate-issue-frontmatter.sh` — requires PostToolUse with file path context). The setup script copies the compatible hook to `.agents/hooks/`.
- **Permissions**: Codex uses `sandbox_mode` + `approval_policy` instead of Claude's per-tool allow/ask/deny rules. Skills that reference `permissionMode` or tool-specific permissions need manual translation to Codex's sandbox/approval model.
