# Product Guidelines

## Voice & Tone

**Concise and technical.** Use imperative, instruction-style prose that matches the existing `SKILL.md` and `AGENTS.md` content. Prefer short directives over narrative. Generated artifacts (specs, plans, status output) should be scannable: tables, checklists, and bullets over paragraphs.

## Design Principles

1. **Cross-harness portability** — Behavior parity across Claude Code and Codex. The `skills/` directory is the single source of truth; avoid harness-specific forks. Keep `.claude-plugin/` and `.codex-plugin/` metadata aligned.
2. **Composability** — Compose with Superpowers and other plugins as the execution engine instead of reimplementing brainstorming, planning, or TDD.
3. **Simplicity** — Favor minimal, predictable workflows over feature breadth. A skill should do one thing along the issue→track→implement→verify pipeline.
4. **Safety & determinism** — Explicit invocation control (`allow_implicit_invocation: false` / `disable-model-invocation` for routing-only, destructive, or session-finalizing skills). No destructive surprises; confirm before irreversible actions.

## Applying These

- When two harnesses could diverge, change shared `skills/` content and let both consume it.
- When adding/renaming/re-scoping a skill, update `README.md`, `codex/INSTALL.md`, `bin/setup-project`, and that skill's `agents/openai.yaml`.
- Keep prose terse enough that a skill stays readable in one screen.
