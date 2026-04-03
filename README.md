# Maestro

Complete development workflow for Claude Code and Codex: issue pipeline, tracked development with specs and plans, UAT, codebase review, and session wrap-up. Uses [Superpowers](https://github.com/obra/superpowers) as the execution engine for brainstorming, planning, TDD, and subagent-driven development.

## Install

### Project-scoped (recommended)

```bash
# Both harnesses at once
./bin/setup-project --both /path/to/your/project

# With Superpowers (recommended — powers brainstorming, planning, and execution)
./bin/setup-project --both --with-superpowers /path/to/your/project
```

### User-scoped (global)

**Claude Code:**
```bash
claude plugin add /path/to/maestro
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
├── /wrap-up        → session cleanup
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
| wrap-up | `/wrap-up` | End-of-session: quality review, issue capture, context updates, commit |

### Routing & Interop

| Skill | Invocation | Purpose |
|-------|------------|---------|
| workflow-router | Auto-activates | Routes to the right skill based on task type |
| agents-md-sync | `/agents-md-sync` | Generate AGENTS.md from CLAUDE.md for Codex |

## Hooks

Two lifecycle hooks automate issue pipeline hygiene. Installed by `setup-project` into `.claude/hooks/` (and `.agents/hooks/` for Codex).

| Hook | Event | What it does | Codex? |
|------|-------|-------------|--------|
| `session-start-issues.sh` | SessionStart | Shows inbox/triaged/reviewed counts at session start | Yes |
| `validate-issue-frontmatter.sh` | PostToolUse (Write/Edit) | Validates issue file frontmatter (status, type, priority, filed) | No |

### Activating hooks (Claude Code)

Add to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{ "command": ".claude/hooks/session-start-issues.sh" }],
    "PostToolUse":  [{ "command": ".claude/hooks/validate-issue-frontmatter.sh", "matcher": "Write|Edit" }]
  }
}
```

### Activating hooks (Codex)

Codex hooks are experimental (`codex_hooks = true` in config). Only SessionStart is supported — the frontmatter validation hook requires Claude Code's richer PostToolUse event.

## Dependencies

- **Superpowers** (strongly recommended): Powers brainstorming, planning, TDD enforcement, and subagent-driven development inside `/new-track` and `/implement`. Without it, these skills fall back to inline workflows — functional but less powerful.
- **code-simplifier** (optional): `/wrap-up` uses the `simplify` skill for code quality review when available. Falls back to a general-purpose review agent.
- **claude-md-management** (optional): `/wrap-up` uses `revise-claude-md` for CLAUDE.md updates when available. Falls back to inline review.
- **No Conductor dependency**: Track management is built in. This plugin absorbs Conductor's organizational patterns and wraps Superpowers' execution engine.

## Codex Compatibility

13 of 15 skills work in Codex via the shared Agent Skills format. See [codex/INSTALL.md](codex/INSTALL.md) for setup and compatibility matrix.

## Quick Start

```bash
# 1. Set up project context
/setup

# 2. Create a track from an idea
/new-track feature user-authentication

# 3. Implement it
/implement user-auth_20260403

# 4. Test it
/uat-create
/uat-run

# 5. Wrap up the session
/wrap-up
```

Or from issues:
```bash
# Add findings to issues/INBOX.md, then:
/triage → /issue-review → /issue-advance → /implement → /uat-create → /wrap-up
```
