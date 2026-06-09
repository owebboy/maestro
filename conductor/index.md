# Conductor Index

Navigation hub for Maestro's development context. These documents inform every Maestro workflow skill.

## Context Documents

- [product.md](product.md) — Vision, problem, target users, goals
- [product-guidelines.md](product-guidelines.md) — Voice, tone, design principles
- [tech-stack.md](tech-stack.md) — Languages, tooling, distribution, dependencies
- [workflow.md](workflow.md) — TDD policy, commits, review, verification checkpoints
- [tracks.md](tracks.md) — Track registry (parsed by `/status`, `/new-track`, `/manage`, `/implement`)
- [code_styleguides/](code_styleguides/) — Per-language conventions (Markdown, Bash, JSON)

## Related (outside conductor/)

- `../AGENTS.md` — Repo map, edit rules, validation commands
- `../README.md` — Install paths and feature overview
- `../issues/` — Issue pipeline (INBOX → triage → review → advance to track)

## Quick Commands

| Command | Purpose |
| ------- | ------- |
| `/maestro:status` | Project + track status |
| `/maestro:new-track` | Start a tracked feature/bug/refactor/chore |
| `/maestro:triage` | Process `issues/INBOX.md` into structured issues |
| `/maestro:session-wrap-up` | End-of-session review, context update, commit |
