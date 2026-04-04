# Maestro

Complete development workflow for Codex: issue pipeline, tracked development with specs and plans, UAT, codebase review, and session wrap-up. Uses [Superpowers](https://github.com/obra/superpowers) as the execution engine for brainstorming, planning, TDD, and subagent-driven development.

## Install

Maestro is Codex-only on this branch.

```bash
# Maestro
bunx skills add owebboy/maestro --agent codex

# Recommended dependencies
bunx skills add obra/superpowers --agent codex
bunx skills add obra/elements-of-style --agent codex
```

Project-scoped install is also supported:

```bash
./bin/setup-project /path/to/your/project
./bin/setup-project --with-superpowers /path/to/your/project
```

See [codex/INSTALL.md](codex/INSTALL.md) for the full setup guide.

## Architecture

Maestro provides organization and coordination. Superpowers provides execution.

```text
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
└── /session-wrap-up → session cleanup
```

## Skills

### Track Management

| Skill | Command | Purpose |
|-------|---------|---------|
| setup | `/setup` | Initialize project context (product, tech stack, workflow) |
| new-track | `/new-track <type> <name>` | Create spec, run design, then produce a plan |
| implement | `/implement [track-id]` | Execute plan with TDD and review checkpoints |
| status | `/status [track-id]` | Project progress, current focus, next actions |
| manage | `/manage [--archive\|--restore\|--delete]` | Track lifecycle management |

### Issue Pipeline

| Skill | Command | Purpose |
|-------|---------|---------|
| triage | `/triage` | `INBOX.md` bullets to structured issue files |
| issue-review | `/issue-review <path>` | 3 parallel agents enrich issue with codebase context |
| issue-advance | `/issue-advance <path\|all>` | Issue to new track |
| issue-close | `/issue-close <path>` | Archive issue as wont-fix, deferred, or duplicate |

### Quality

| Skill | Command | Purpose |
|-------|---------|---------|
| codebase-review | `/codebase-review [scope]` | 6+6 parallel agents: review wave then audit wave |
| uat-create | `/uat-create` | Completed tracks to UAT checklist |
| uat-run | `/uat-run [file\|date]` | Interactive UAT proctor with failure capture |
| session-wrap-up | `/session-wrap-up` | End-of-session review, issue capture, context updates, commit |

## Hooks

Maestro ships one Codex-compatible hook helper:

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start-issues.sh` | SessionStart | Shows inbox/triaged/reviewed counts at session start |

`validate-issue-frontmatter.sh` remains a helper script in the repo, but Codex does not provide the file-path context needed to wire it up as an equivalent automatic hook.

## Dependencies

Maestro works standalone. The full workflow is stronger with the recommended Codex skills installed.

### Recommended

```bash
bunx skills add obra/superpowers --agent codex
bunx skills add obra/elements-of-style --agent codex
```

| Dependency | Used by | What it adds |
|------------|---------|-------------|
| **[Superpowers](https://github.com/obra/superpowers)** | `/new-track`, `/implement` | Brainstorming, phased planning, subagent-driven TDD, code review |
| **[Elements of Style](https://github.com/obra/the-elements-of-style)** | `/triage`, `/issue-review` | Clear, concise writing polish for issue descriptions |

### Optional

| Dependency | Used by | What it adds |
|------------|---------|-------------|
| code-simplifier | `/session-wrap-up`, `/implement` | Code quality review during checkpoints |

## Codex Compatibility

This branch is Codex-native. Install skills into user scope with `skills.sh`, or into a project with `./bin/setup-project`.

Maestro preserves these on-disk contracts for existing projects:

- `conductor/`
- `issues/`
- track `spec.md`, `plan.md`, and `metadata.json`
- `conductor/tracks.md`
- `conductor/UAT-YYYY-MM-DD.md`

## Quick Start

### 1. Install and initialize

```bash
bunx skills add owebboy/maestro --agent codex

# In your project:
/setup
```

`/setup` creates a `conductor/` directory with project context. Every other skill reads from it.

### 2. Pick your path

Direct track:

```text
/new-track feature user-authentication
/implement
```

Issue pipeline:

```text
/triage
/issue-review all
/issue-advance all
/implement
```

Health check:

```text
/codebase-review
```

### 3. Validate and ship

```text
/uat-create
/uat-run
/session-wrap-up
```
