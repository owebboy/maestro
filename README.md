# Maestro

Complete development workflow for Claude Code and Codex: issue pipeline, tracked development with specs and plans, UAT, codebase review, and session wrap-up. Uses [Superpowers](https://github.com/obra/superpowers) as the execution engine for brainstorming, planning, TDD, and subagent-driven development.

## Install

### Claude Code plugin (recommended)

```bash
# Add as a marketplace source
claude plugin marketplace add owebboy/maestro

# Install the plugin
claude plugin install maestro@maestro-dev
```

### Project-scoped

```bash
# Both harnesses at once
./bin/setup-project --both /path/to/your/project

# With Superpowers (recommended — powers brainstorming, planning, and execution)
./bin/setup-project --both --with-superpowers /path/to/your/project
```

**Codex:** See [codex/INSTALL.md](codex/INSTALL.md)

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

| Skill | Command | Purpose |
|-------|---------|---------|
| setup | `/setup` | Initialize project context (product, tech stack, workflow) |
| new-track | `/new-track <type> <name>` | Create spec → brainstorm → plan (via Superpowers) |
| implement | `/implement [track-id]` | Execute plan with TDD + subagent review (via Superpowers) |
| status | `/status [track-id]` | Project progress, current focus, next actions |
| manage | `/manage [--archive\|--restore\|--delete]` | Track lifecycle management |

### Issue Pipeline

| Skill | Command | Purpose |
|-------|---------|---------|
| triage | `/triage` | INBOX.md bullets → structured issue files |
| issue-review | `/issue-review <path>` | 3 parallel agents enrich issue with codebase context |
| issue-advance | `/issue-advance <path\|all>` | Issue → new track (spec + brainstorm + plan) |
| issue-close | `/issue-close <path>` | Archive as wont-fix, deferred, or duplicate |

**Flow:** `INBOX.md → /triage → /issue-review → /issue-advance → /implement`

### Quality

| Skill | Command | Purpose |
|-------|---------|---------|
| codebase-review | `/codebase-review [scope]` | 6+6 parallel agents: review wave then audit wave |
| uat-create | `/uat-create` | Completed tracks → UAT checklist |
| uat-run | `/uat-run [file\|date]` | Interactive UAT proctor with failure capture |
| session-wrap-up | `/session-wrap-up` | End-of-session: quality review, issue capture, context updates, commit |

### Routing & Interop

| Skill | Invocation | Purpose |
|-------|------------|---------|
| workflow-router | Auto-activates | Routes to the right skill based on task type |
| agents-md-sync | `/agents-md-sync` | Generate AGENTS.md from CLAUDE.md for Codex |

## Hooks

Two lifecycle hooks auto-activate when the plugin is installed (via `hooks/hooks.json`). No manual `settings.json` configuration needed.

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start-issues.sh` | SessionStart | Shows inbox/triaged/reviewed counts at session start |
| `validate-issue-frontmatter.sh` | PostToolUse (Write/Edit) | Validates issue file frontmatter (status, type, priority, filed) |

### Codex

Codex hooks are experimental (`codex_hooks = true` in config). The `setup-project --codex` script copies the compatible `session-start-issues.sh` hook to `.agents/hooks/`. The frontmatter validation hook requires Claude Code's richer PostToolUse event and is not available in Codex.

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

13 of 15 skills work in Codex via the shared Agent Skills format. Install with [skills.sh](https://skills.sh/):

```bash
# Maestro
bunx skills add owebboy/maestro --agent codex

# Recommended
bunx skills add obra/superpowers --agent codex
bunx skills add obra/elements-of-style --agent codex
```

See [codex/INSTALL.md](codex/INSTALL.md) for full setup and compatibility matrix.

## Quick Start

### 1. Install and initialize

```bash
claude plugin marketplace add owebboy/maestro
claude plugin install maestro@maestro-dev

# In your project:
/setup
```

`/setup` walks you through an interactive Q&A (product, tech stack, workflow preferences) and creates a `conductor/` directory with your project context. Every other skill reads from this.

### 2. Pick your path

**Path A: Direct track** — you know what you want to build.

```
/new-track feature user-authentication
```

Maestro gathers a spec (interactive Q&A), runs brainstorming for the design, then generates a phased implementation plan. All artifacts land in `conductor/tracks/{trackId}/`.

```
/implement
```

Executes the plan task-by-task with TDD (red-green-refactor), commits per task, and runs parallel code review at each phase checkpoint. Out-of-scope findings get filed to `issues/INBOX.md` automatically.

**Path B: Issue pipeline** — you have a pile of bugs, ideas, or review findings.

```
/triage
```

Parses raw bullets from `issues/INBOX.md` into structured issue files with type/priority classification.

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

Six review agents (security, performance, architecture, testing, data integrity, UX) run in parallel, then six audit agents verify the findings. Confirmed issues go to `issues/INBOX.md` for triage.

### 3. Validate and ship

```
/uat-create          # generates acceptance test checklist from completed tracks
/uat-run             # interactive proctor — walks through tests, captures failures to INBOX
```

### 4. Wrap up

```
/session-wrap-up
```

Parallel quality review (code simplifier + code reviewer + spec reviewer), captures any untracked issues to INBOX, updates CLAUDE.md and project context, commits session work.

### 5. Housekeeping

```
/manage                      # interactive menu: archive, restore, delete, rename, cleanup
/manage --archive auth_20260403   # archive a completed track
/manage --cleanup            # find orphaned artifacts, stale in-progress tracks
/issue-close issues/2026-04-03-old-bug.md   # close an issue as wont-fix, deferred, or duplicate
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

## Acknowledgements

Inspired by [wshobson/agents](https://github.com/wshobson/agents) for the track-based development workflow and issue pipeline patterns. Built on [obra/superpowers](https://github.com/obra/superpowers) as the execution engine.
