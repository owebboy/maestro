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
| "Add feature", needs design, TDD, multi-file changes | **tracked work item** `/track-new` | Creates spec, invokes Superpowers brainstorming → planning → execution |
| Multi-phase work, needs spec + phased plan, project-level tracking | **tracked work item** `/track-new` | Tracked weight with spec.md, plan.md, phase checkpoints |
| Work item in-progress | **Implement** `/implement` | Continue where the last session left off |
| `.maestro/inbox.md` has unprocessed bullets | **Triage** `/triage` | Process raw findings into structured work items |
| Triaged work item needs codebase context | **Review** `/item-review` | 3 parallel agents enrich the item |
| Small reviewed item: ≤3 files, testable criteria, no design decisions | **Direct** `/implement <item-ref>` | Implements the item directly with TDD; on completion sets a terminal status (done) which archives it |
| Reviewed item needing design or multi-phase work | **Advance** `/item-advance` | Promote to tracked weight with spec + plan |
| Need a full codebase health check | **Codebase review** `/codebase-review` | 6+6 parallel agent review/audit pattern |
| Completed work items need acceptance testing | **UAT** `/uat-create` then `/uat-run` | Generate and run UAT checklist |
| Session ending, user is done for now | **Wrap-up** `/session-wrap-up` | Quality review, item capture, context updates, commit |
| No `.maestro/config.json` present | **Setup** `/setup` | Initialize project context (product, tech stack, workflow) |
| Need project overview | **Status** `/status` | Work item summary, current focus, next actions |
| Work item housekeeping needed | **Manage** `/manage` | Archive, restore, delete, rename, cleanup |
| Need Codex/AGENTS.md interop, or CLAUDE.md changed and AGENTS.md is stale | **AGENTS.md sync** `/agents-md-sync` | Generate/refresh AGENTS.md from CLAUDE.md for Codex |

## Availability Detection

Before routing, check what's installed:

- **Plan Mode**: Always available in Claude Code. In Codex, use a brief inline plan for small work or `$track-new` for tracked planning.
- **Superpowers**: Detect using the [detection procedure](../../docs/detecting-optional-skills.md), checking both plugin-prefixed and bare forms. If found, `/track-new` and `/implement` use it as the execution engine. If not, they fall back to inline brainstorming and TDD.
- **Maestro**: Check if `.maestro/config.json` exists. If not, suggest `/setup` for projects that would benefit from Maestro's work-item pipeline. If present, read the `adapter` field and load the capability flags from `.maestro/adapters/<adapter>.md` — the unified work-item pipeline (triage → review → [advance] → implement) is available regardless of adapter.
- **Hooks**: Some workflows benefit from hook-driven automation (e.g., SessionStart for context injection). Both harnesses support lifecycle hooks using the same nested schema; Codex hooks are on by default (disable with `[features] hooks = false`). Codex covers 5 events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop); Claude adds SessionEnd, SubagentStop, PreCompact, and Notification. Plan accordingly.

## When Multiple Skills Compose

Common compositions:

1. **Triage → review → implement** (light item): `/triage` → `/item-review` → `/implement <item-ref>`
2. **Triage → review → advance → implement** (tracked item): `/triage` → `/item-review` → `/item-advance` → `/implement`
3. **Quick fix found during work**: Use Plan Mode for the fix, capture as inbox item if out of scope
4. **Review → items → tracked**: `/codebase-review` → `/triage` → `/item-advance all`
5. **End of day**: `/session-wrap-up` → quality review, item capture, context updates, commit

## When to Use Plan Mode vs light vs tracked

- **Plan Mode** — quick, obvious task. One file, one fix, think-before-coding. No ceremony.
- **Light work item** — any non-trivial task that needs triage, enrichment, and a single `/implement` pass. Goes through triage → review → implement without a full spec/plan.
- **Tracked work item** — anything that benefits from a spec, a design phase, or tracked progress. The `/item-advance` or `/track-new` flow writes spec.md + plan.md and uses Superpowers brainstorming and planning under the hood, so you get structured design + TDD + subagent orchestration automatically. Use whenever the work spans multiple files/sessions or needs a design decision.
