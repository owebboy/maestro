---
name: workflow-router
description: Use when the user asks which Maestro workflow fits a task, or invokes the router directly to choose one based on scope, complexity, and available tools.
---

# Workflow Router

This project uses up to three workflow engines at different scope levels. Pick the right one based on the task. Use slash commands in Claude Code and `$skill-name` invocations in Codex.

## Decision Matrix

| Task Signal | Route To | Why |
|-------------|----------|-----|
| Quick fix, single file, obvious change | **Plan Mode** (built-in) | Think before coding, no ceremony needed |
| "Add feature", needs design, TDD, multi-file changes | **Track workflow** `/new-track` | Creates spec, invokes Superpowers brainstorming → planning → execution |
| Multi-phase work, needs spec + phased plan, project-level tracking | **Track workflow** `/new-track` | Track lifecycle with spec.md, plan.md, phase checkpoints |
| Existing track is in-progress | **Track workflow** `/implement` | Continue where the last session left off |
| INBOX.md has unprocessed bullets | **Issue pipeline** `/triage` | Process raw findings into structured issues |
| Triaged issue needs codebase context | **Issue pipeline** `/issue-review` | 3 parallel agents enrich the issue |
| Small reviewed issue: ≤3 files, testable criteria, no design decisions | **Direct** `/implement <issue-path>` | Implements the issue directly with TDD; archives as implemented |
| Reviewed issue needing design or multi-phase work | **Issue pipeline** `/issue-advance` | Convert issue to track via `/new-track` |
| Need a full codebase health check | **Codebase review** `/codebase-review` | 6+6 parallel agent review/audit pattern |
| Completed tracks need acceptance testing | **UAT** `/uat-create` then `/uat-run` | Generate and run UAT checklist |
| Session ending, user is done for now | **Wrap-up** `/session-wrap-up` | Quality review, issue capture, context updates, commit |
| New project, no conductor/ directory | **Setup** `/setup` | Initialize project context (product, tech stack, workflow) |
| Need project overview | **Status** `/status` | Track summary, current focus, next actions |
| Track housekeeping needed | **Manage** `/manage` | Archive, restore, delete, rename, cleanup |

## Availability Detection

Before routing, check what's installed:

- **Plan Mode**: Always available in Claude Code. In Codex, use a brief inline plan for small work or `$new-track` for tracked planning.
- **Superpowers**: Detect using the [multi-signal procedure](../../docs/detecting-optional-skills.md) (check, in order: the available-skills list for the prefixed or bare name; `.claude/settings.json` `enabledPlugins`; a `.claude/skills/<name>/` or `.agents/skills/<name>/` directory). If found, `/new-track` and `/implement` use it as the execution engine. If not, they fall back to inline brainstorming and TDD.
- **Track system**: Check if `conductor/` directory exists. If not, suggest `/setup` for projects that would benefit from tracked development.
- **Issue pipeline**: Check if `issues/` directory exists. If not, it can be created on first `/triage`.
- **Hooks**: Some workflows benefit from hook-driven automation (e.g., SessionStart for context injection). Both harnesses support lifecycle hooks using the same nested schema; Codex hooks are on by default (disable with `[features] hooks = false`). Codex covers 5 events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop); Claude adds SessionEnd, SubagentStop, PreCompact, and Notification. Plan accordingly.

## When Multiple Skills Compose

Common compositions:

1. **Issue → Track → Implementation**: `/triage` → `/issue-review` → `/issue-advance` → `/implement`
   - Small issues can skip the track: `/triage` → `/issue-review` → `/implement <issue-path>`
2. **Quick fix found during track work**: Use Plan Mode for the fix, capture as INBOX item if out of scope
3. **Review → Issues → Tracks**: `/codebase-review` → `/triage` → `/issue-advance all`
4. **End of day**: `/session-wrap-up` → quality review, issue capture, context updates, commit

## When to Use Plan Mode vs /new-track

- **Plan Mode** — quick, obvious task. One file, one fix, think-before-coding. No ceremony.
- **`/new-track`** — anything that benefits from a spec, a design phase, or tracked progress. The track workflow uses Superpowers brainstorming and planning under the hood, so you get structured design + TDD + subagent orchestration automatically. Use this whenever the work is non-trivial or spans multiple files/sessions.
