# Maestro

Complete development workflow for Claude Code and Codex: issue pipeline, tracked development with specs and plans, UAT, codebase review, and session wrap-up. Uses [Superpowers](https://github.com/obra/superpowers) as the execution engine for brainstorming, planning, TDD, and subagent-driven development.

## Install

### Codex plugin (repo-local)

If you're working from a checkout of this repository in Codex:

1. Restart Codex so it picks up [`.agents/plugins/marketplace.json`](./.agents/plugins/marketplace.json)
2. Open the plugin directory
3. Choose `Maestro Local Plugins`
4. Install `maestro`

This uses the Codex plugin manifest at [`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json).

### Codex via skills.sh

```bash
# Maestro
bunx skills add owebboy/maestro --agent codex --yes --global

# Recommended dependencies
bunx skills add obra/superpowers --agent codex --yes --global
bunx skills add obra/elements-of-style --agent codex --yes --global
```

### Claude Code plugin

```bash
# Add as a marketplace source
claude plugin marketplace add owebboy/maestro

# Install the plugin
claude plugin install maestro@maestro-dev
```

### Claude Code via project settings

Add to your project's `.claude/settings.json` so collaborators get Maestro (and recommended plugins) automatically when they trust the project folder:

```json
{
  "enabledPlugins": {
    "maestro@maestro-dev": true,
    "superpowers@superpowers-marketplace": true,
    "elements-of-style@superpowers-marketplace": true,
    "code-simplifier@claude-plugins-official": true,
    "claude-md-management@claude-plugins-official": true
  },
  "extraKnownMarketplaces": {
    "maestro-dev": {
      "source": {
        "source": "github",
        "repo": "owebboy/maestro"
      }
    },
    "superpowers-marketplace": {
      "source": {
        "source": "github",
        "repo": "obra/superpowers-marketplace"
      }
    },
    "claude-plugins-official": {
      "source": {
        "source": "github",
        "repo": "anthropics/claude-plugins-official"
      }
    }
  }
}
```

### Project-scoped (manual)

```bash
# Current directory, auto-detect harnesses
# Defaults to both in a new project
./bin/setup-project

# Portable install: copy skills into the target repo instead of symlinking
./bin/setup-project --portable /path/to/your/project
```

The helper installs Maestro only. Install Superpowers separately via its official installer if you want the full brainstorming, planning, and execution workflow.

The helper bootstraps a `.maestro/` directory (layout: `config.json` plus the package-managed `CONTRACT.md` and `adapters/`, then `context/`, `work/`, `items/`, `inbox.md`), installs compatible hook scripts, and creates `.claude/settings.json` with hook config when that file does not already exist.

Full Codex setup and compatibility details: [codex/INSTALL.md](codex/INSTALL.md)

## Architecture

Maestro provides **organization and coordination**. Superpowers provides **execution**.

```
Maestro (WHAT and WHEN)                    Superpowers (HOW)
├── /setup          → project context      ├── brainstorming → design
├── /new-track      → spec + invokes ────► ├── writing-plans → plan
├── /implement      → track mgmt + ──────► ├── subagent-driven-development
├── /status         → progress view        ├── test-driven-development
├── /manage         → lifecycle            ├── systematic-debugging
├── /triage         → issue pipeline       ├── verification-before-completion
├── /issue-review   → codebase explore     └── finishing-a-development-branch
├── /issue-advance  → issue → track
├── /issue-close    → archive issue
├── /codebase-review → 6+6 agents
├── /uat-create     → UAT checklist
├── /uat-run        → interactive proctor
├── /session-wrap-up → session cleanup
└── /agents-md-sync → Codex interop
```

## Skills

### Track Management

| Skill | Invocation | Purpose |
|-------|------------|---------|
| setup | `/setup` or `$setup` | Initialize project context (product, tech stack, workflow) |
| new-track | `/new-track <type> <name>` or `$new-track <type> <name>` | Create spec → brainstorm → plan (via Superpowers) |
| implement | `/implement [track-id\|issue-file]` or `$implement [track-id\|issue-file]` | Execute plan with TDD + subagent review (via Superpowers); small issues run directly, no track needed |
| status | `/status [track-id]` or `$status [track-id]` | Project progress, current focus, next actions |
| manage | `/manage [--archive\|--restore\|--delete]` or `$manage ...` | Track lifecycle management |

### Issue Pipeline

| Skill | Invocation | Purpose |
|-------|------------|---------|
| triage | `/triage` or `$triage` | INBOX.md bullets → structured issue files |
| issue-review | `/issue-review <path>` or `$issue-review <path>` | 3 parallel agents enrich issue with codebase context |
| issue-advance | `/issue-advance <path\|all>` or `$issue-advance <path\|all>` | Issue → new track (spec + brainstorm + plan) |
| issue-close | `/issue-close <path>` or `$issue-close <path>` | Archive as wont-fix, deferred, or duplicate |

**Flow:** `.maestro/inbox.md → /triage → /issue-review → /issue-advance → /implement`

**Shortcut for small issues:** `/implement .maestro/items/<file>.md` skips the track ceremony — a simplicity gate sizes the issue (≤3 files, testable criteria, no design decisions), then TDD, one commit, one approval, and the issue archives as `done`.

### Quality

| Skill | Invocation | Purpose |
|-------|------------|---------|
| codebase-review | `/codebase-review [scope]` or `$codebase-review [scope]` | 6+6 parallel agents: review wave then audit wave |
| uat-create | `/uat-create` or `$uat-create` | Completed tracks → UAT checklist |
| uat-run | `/uat-run [file\|date]` or `$uat-run [file\|date]` | Interactive UAT proctor with failure capture |
| session-wrap-up | `/session-wrap-up` or `$session-wrap-up` | End-of-session: quality review, issue capture, context updates, commit |

### Routing & Interop

| Skill | Invocation | Purpose |
|-------|------------|---------|
| workflow-router | Auto or `/workflow-router` in Claude; auto or `$workflow-router` in Codex | Routes to the right skill based on task type |
| agents-md-sync | `/agents-md-sync` or `$agents-md-sync` | Generate AGENTS.md from CLAUDE.md for Codex |

## Hooks

Two lifecycle hooks auto-activate when the Claude plugin is installed (via `hooks/hooks.json`). No manual `settings.json` configuration needed.

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start-maestro.sh` | SessionStart | Summarizes `.maestro/` work items (inbox, in-progress, done counts) at session start |
| `validate-item-frontmatter.sh` | PostToolUse (Write/Edit) | Validates `.maestro/items/` frontmatter (id, title, type, priority, status, weight) |

### Codex

Codex supports lifecycle hooks (on by default; disable with `[features] hooks = false`) using the same nested schema as Claude. Hooks must be registered in a `hooks.json` beside an active config layer, so `setup-project --codex` writes `<repo>/.codex/hooks.json` registering `session-start-maestro.sh` (a script merely placed in `.agents/hooks/` is not auto-run). The item frontmatter validation hook requires Claude Code's PostToolUse file-path context and is not available in Codex.

## Dependencies

Maestro works standalone — every dependency has an inline fallback. But the full experience comes from installing the recommended plugins.

### Recommended

```bash
# Add the superpowers marketplace (hosts both plugins)
claude plugin marketplace add obra/superpowers-marketplace

# Superpowers — brainstorming, phased planning, subagent-driven TDD, code review
claude plugin install superpowers@superpowers-marketplace

# Elements of Style — clear, concise writing polish for issue descriptions
claude plugin install elements-of-style@superpowers-marketplace
```

| Plugin | Used by | What it adds |
|--------|---------|-------------|
| **[Superpowers](https://github.com/obra/superpowers)** | `/new-track`, `/implement` | Brainstorming, phased planning, subagent-driven TDD, code review |
| **[Elements of Style](https://github.com/obra/the-elements-of-style)** | `/triage`, `/issue-review` | Clear, concise writing polish for issue descriptions |

### Optional

```bash
# Code Simplifier — code quality review during phase checkpoints and wrap-up
claude plugin install code-simplifier@claude-plugins-official

# CLAUDE.md Management — automated CLAUDE.md updates at session end
claude plugin install claude-md-management@claude-plugins-official
```

| Plugin | Used by | What it adds |
|--------|---------|-------------|
| **code-simplifier** | `/session-wrap-up`, `/implement` | Code quality review during phase checkpoints and session wrap-up |
| **claude-md-management** | `/session-wrap-up` | Automated CLAUDE.md updates at session end |

### No external dependencies required

- **No Conductor dependency**: Track management is built in. Maestro absorbs Conductor's organizational patterns and wraps Superpowers' execution engine.
- Every skill that uses an optional plugin falls back to an inline workflow when the plugin isn't installed.

## Codex Compatibility

Maestro now ships first-class Codex packaging: a `.codex-plugin/plugin.json` manifest, a repo-local `.agents/plugins/marketplace.json`, and per-skill `agents/openai.yaml` metadata. All 15 skills are packaged for Codex; a few remain partial or explicit-only. Install the skill bundle with [skills.sh](https://skills.sh/) or use the repo-local plugin when working from a checkout of this repository. In Codex, invoke skills with `$setup`, `$new-track`, `$triage`, and the rest of the `$skill-name` set:

```bash
# Maestro
bunx skills add owebboy/maestro --agent codex --yes --global

# Recommended
bunx skills add obra/superpowers --agent codex --yes --global
bunx skills add obra/elements-of-style --agent codex --yes --global
```

See [codex/INSTALL.md](codex/INSTALL.md) for full setup and compatibility matrix.

## Quick Start

### 1. Install and initialize

```bash
# Claude Code
claude plugin marketplace add owebboy/maestro
claude plugin install maestro@maestro-dev

# Codex alternative
# - install `maestro` from "Maestro Local Plugins" in the plugin directory, or
# - use: bunx skills add owebboy/maestro --agent codex --yes --global

# Then in your project:
/setup
```

`/setup` walks you through an interactive Q&A (product, tech stack, workflow preferences) and creates a `.maestro/` directory with your project context (under `.maestro/context/`). Every other skill reads from this. In Codex, use the same skill names with `$`, for example `$setup`, `$triage`, and `$implement`.

### 2. Pick your path

**Path A: Direct track** — you know what you want to build.

```
/new-track feature user-authentication
```

Maestro gathers a spec (interactive Q&A), runs brainstorming for the design, then generates a phased implementation plan. Prose artifacts (spec, design, plan) land in `.maestro/work/{trackId}/`; the item record lands in `.maestro/items/{id}.md`.

```
/implement
```

Executes the plan task-by-task with TDD (red-green-refactor), commits per task, and runs parallel code review at each phase checkpoint. Out-of-scope findings get filed to `.maestro/inbox.md` automatically.

**Path B: Issue pipeline** — you have a pile of bugs, ideas, or review findings.

```
/triage
```

Parses raw bullets from `.maestro/inbox.md` into structured item records under `.maestro/items/` with type/priority classification.

```
/issue-review all
```

Three parallel agents enrich each issue with affected files, related tests, and similar prior work. Writing gets polished automatically.

```
/issue-advance all
```

Converts reviewed issues into tracks (invokes `/new-track` under the hood, auto-answering from issue data). Related issues get grouped. Then `/implement` as above.

**Path C: Health check** — audit the whole codebase.

```
/codebase-review
```

Six review agents (security, performance, architecture, testing, data integrity, UX) run in parallel, then six audit agents verify the findings. Confirmed issues go to `.maestro/inbox.md` for triage.

### 3. Validate and ship

```
/uat-create          # generates acceptance test checklist from completed tracks
/uat-run             # interactive proctor — walks through tests, captures failures to INBOX
```

### 4. Wrap up

```
/session-wrap-up
```

Parallel quality review (code simplifier + code reviewer + spec reviewer), captures any untracked issues to `.maestro/inbox.md`, updates CLAUDE.md and project context, commits session work.

### 5. Housekeeping

```
/manage                      # interactive menu: archive, restore, delete, rename, cleanup
/manage --archive auth_20260403   # archive a completed track
/manage --cleanup            # find orphaned artifacts, stale in-progress tracks
/issue-close .maestro/items/0042-old-bug.md   # close an item as wont-fix, deferred, or duplicate
```

### 6. Check in anytime

```
/status              # tracks, tasks, phases, blockers, and issue pipeline counts
/status --quick      # one-liner: "MyApp: 14/20 tasks (70%) — Active: auth, Task 2.3"
```

### Lifecycle at a glance

```
/setup → /new-track → /implement → /uat-create → /uat-run → /session-wrap-up
                          ↑
/triage → /issue-review → /issue-advance
                          ↑
              /codebase-review
```

## Upgrading from the legacy `conductor` + `issues` layout

If your project was set up with the old two-directory model (a `conductor` directory for tracks and an `issues` directory for the issue pipeline), migrate it to the unified `.maestro/` layout in two steps:

```bash
# Step 1: dry run — preview what will move, no writes
bin/migrate-to-maestro --path /path/to/your/project

# Step 2: apply — write .maestro/, rename old dirs to .conductor.bak and .issues.bak
bin/migrate-to-maestro --path /path/to/your/project --apply

# Optional: once you've verified the result, remove the legacy backups
bin/migrate-to-maestro --path /path/to/your/project --apply --remove-legacy
```

The migrator is safe to re-run: the dry run is read-only, `--apply` only writes when it will not overwrite existing `.maestro/` content, and the legacy directories are renamed (not deleted) unless you pass `--remove-legacy`. Every item gets a canonical `status` (mapped from old track and issue statuses), and provenance (old IDs, prior links) is preserved in each item's `## Notes` block.

After migration, re-run `bin/setup-project` to refresh hooks to `session-start-maestro.sh` and `validate-item-frontmatter.sh`.

## Acknowledgements

Inspired by [wshobson/agents](https://github.com/wshobson/agents) for the track-based development workflow and issue pipeline patterns. Built on [obra/superpowers](https://github.com/obra/superpowers) as the execution engine.
