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
bunx skills add owebboy/maestro --agent codex --yes --global

# Recommended dependencies
bunx skills add obra/superpowers --agent codex --yes --global
bunx skills add obra/elements-of-style --agent codex --yes --global
```

`--yes --global` keeps the install non-interactive and user-scoped, which is the most repeatable path for Codex.

## Install via setup-project

```bash
# Current directory, auto-detect harnesses
# Defaults to both in a new project
./bin/setup-project

# Codex only:
./bin/setup-project --codex /path/to/your/project

# Portable install: copy skills into the target repo instead of symlinking
./bin/setup-project --portable --codex /path/to/your/project
```

By default this symlinks skills into your project's `.agents/skills/` directory where Codex discovers them automatically. Use `--portable` to copy them into the target repo instead.

The helper bootstraps a `.maestro/` directory (layout: `context/`, `work/`, `items/`, `inbox.md`, `config.json`) and registers the compatible Codex session-start hook by writing `<repo>/.codex/hooks.json`.

Install Superpowers separately via its official installer if you want Maestro's optional brainstorming, planning, and TDD integrations.

## Install manually (user-scoped, global)

```bash
# Clone the plugin
git clone https://github.com/owebboy/maestro.git ~/.codex/maestro

# Symlink each skill into Codex's global skill discovery path
mkdir -p "$HOME/.agents/skills"
for skill in ~/.codex/maestro/skills/*/; do
  name="$(basename "$skill")"
  ln -s "$skill" "$HOME/.agents/skills/$name"
done
```

## Configuration

Subagents are enabled by default in current Codex releases. Add optional project-scoped config (`.codex/config.toml` in the project) if you want predictable agent fan-out:

```toml
[agents]
max_threads = 6
max_depth = 1
```

To read `CLAUDE.md` as a fallback when a directory has no `AGENTS.md`, add this **top-level** key to your **global** `~/.codex/config.toml` — it is not a `[project]` table key, and not project-local:

```toml
project_doc_fallback_filenames = ["CLAUDE.md"]
```

This is a fallback only — if `AGENTS.md` exists it always wins and `CLAUDE.md` is ignored.

## Work Item Layout

Maestro uses a unified `.maestro/` directory for all workflow data — context, work artifacts, and item records:

```
.maestro/
  config.json      # adapter choice + options (project-owned, committed)
  CONTRACT.md      # the 12-op adapter contract (package-managed, copied at setup)
  adapters/        # adapter profiles, e.g. files.md (package-managed, copied at setup)
  context/         # product.md, tech-stack.md, workflow.md, guidelines.md
  work/            # <id>/spec.md, design.md, plan.md  (prose artifacts)
  items/           # <id>.md item records + archived/<status>/<id>.md
  inbox.md         # pre-triage scratch
```

Skills read from and write to `.maestro/`. The SessionStart hook (`session-start-maestro.sh`) summarizes work items at the start of each Codex session.

### Work-item backends

The work-item store is a pluggable adapter, chosen at `$setup`: `files` (default — local Markdown in `.maestro/items/`), `gitea` (MCP / `tea` / REST), `github` (`gh` / REST), `gitlab` (`glab` / REST, scoped labels), or the native trackers `linear` (MCP / GraphQL, no CLI) and `jira` (MCP / `jira` CLI / REST). All adapter profiles ship under `assets/maestro/adapters/` and are copied into `.maestro/adapters/` (both `linear` and `jira` load the single `linear-jira.md` profile). Lifecycle skills stay backend-agnostic; the active adapter is named in `config.json`, and forge/native backends resolve transport in MCP > CLI > API order. For forges, `$setup` captures the connection and idempotently bootstraps the required labels; for `linear`/`jira` it discovers the team's native workflow states and writes a `config.statusMap` (requires that discovery step) so any custom board fits with zero skill edits.

### Migrating from the legacy layout

If your project used the old two-directory model (a `conductor` directory for tracks plus an `issues` directory for the pipeline), run the bundled migrator:

```bash
# Dry run first (default — read-only, no writes)
bin/migrate-to-maestro --path /path/to/your/project

# Apply: write .maestro/, rename old dirs to .conductor.bak and .issues.bak
bin/migrate-to-maestro --path /path/to/your/project --apply
```

After migration, re-run `bin/setup-project --codex` to register the updated hooks.

## Skill Compatibility

| Skill | Codex Support | Notes |
|-------|--------------|-------|
| setup | Full | Interactive Q&A, creates markdown files |
| new-track | Full* | *Superpowers brainstorming/planning falls back to inline if not installed |
| implement | Full* | *Superpowers subagent-driven-dev falls back to inline TDD; direct issue mode is fully inline (no subagents needed) |
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
| workflow-router | Full | Routing helper; auto-loads when you ask which workflow to use, or invoke `$workflow-router` directly |
| agents-md-sync | Full | Generates `AGENTS.md` from `CLAUDE.md` for dual-harness repos |

## Dependencies

- **Superpowers** (strongly recommended): Powers brainstorming, planning, TDD, and subagent-driven development inside `/new-track` and `/implement`. Without it, these skills fall back to inline workflows. Superpowers skills are standard SKILL.md format and fully portable to Codex.
- **No Conductor dependency**: Track management (setup, new-track, implement, status, manage) is built into Maestro.

## Differences from Claude Code

- **Agent spawning**: Current Codex releases enable subagents by default, but Codex still only spawns them when explicitly asked. Skills that dispatch parallel agents should say which agent type to use and require explicit invocation via `$skill-name` or `/skills`.
- **Auto-memory**: No equivalent to Claude's `~/.claude/projects/<project>/memory/`. Use `AGENTS.md` for persistent context, or build a memory process using Codex hooks/scripts.
- **MCP config**: User-scoped servers live in `config.toml` under `[mcp_servers.<name>]`. (Maestro itself ships no MCP server.)
- **Frontmatter**: Codex ignores Claude-specific frontmatter fields (`user-invocable`, `disable-model-invocation`, `context`). Skills still load — the fields are simply skipped.
- **Hooks**: Codex supports lifecycle hooks (on by default; disable with `[features] hooks = false`), using the same nested `{matcher, hooks: [...]}` schema as Claude. Hooks must be registered in a `hooks.json` (or `[hooks]` table) beside an active config layer — e.g. `<repo>/.codex/hooks.json`; a script merely placed in `.agents/hooks/` is not auto-run. Maestro ships 1 Codex-compatible hook (`session-start-maestro.sh`), which summarizes `.maestro/` work items at session start; `validate-item-frontmatter.sh` is Claude-only (it needs PostToolUse file-path context). `setup-project --codex` registers the session-start hook by writing `<repo>/.codex/hooks.json`.
- **Permissions**: Codex uses `sandbox_mode` + `approval_policy` instead of Claude's per-tool allow/ask/deny rules. Skills that reference `permissionMode` or tool-specific permissions need manual translation to Codex's sandbox/approval model.
