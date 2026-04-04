# Detecting Optional Skills

Maestro detects optional skills using Codex-visible signals only. Treat a skill as available only when Codex can observe it through the current session or documented Codex-local installation paths.

## Detection Procedure

Check these signals in order and treat the skill as available if any signal is positive:

### 1. Current session skill inventory

Check whether the skill appears in the current session's available skills list. Match both prefixed and unprefixed forms when relevant.

### 2. Project-scoped install

Check whether `.agents/skills/{skill-name}/SKILL.md` exists in the project.

### 3. Documented Codex-local install

Check whether the relevant skill exists in a documented Codex-local installation path such as:

- `~/.codex/superpowers/skills/{skill-name}/SKILL.md`
- `~/.codex/skills/...` when the dependency documents that layout

If the dependency has no documented Codex-local install path, skip this step.

### 4. Inline fallback

If no Codex-visible signal is positive, use the inline Maestro fallback for that workflow.

## Skill Name Reference

| Dependency | Skills provided | Common names |
|------------|-----------------|--------------|
| Superpowers | brainstorming | `brainstorming`, `superpowers:brainstorming` |
| Superpowers | writing-plans | `writing-plans`, `superpowers:writing-plans` |
| Superpowers | subagent-driven-development | `subagent-driven-development`, `superpowers:subagent-driven-development` |
| Superpowers | executing-plans | `executing-plans`, `superpowers:executing-plans` |
| Elements of Style | writing-clearly-and-concisely | `writing-clearly-and-concisely`, `elements-of-style:writing-clearly-and-concisely` |
| code-simplifier | simplify | `simplify` |

## Example

To detect Superpowers brainstorming:

1. Check whether `brainstorming` is visible in the current session
2. Check for `.agents/skills/brainstorming/SKILL.md`
3. Check for `~/.codex/superpowers/skills/brainstorming/SKILL.md`
4. If none exist, run the inline brainstorming flow

See [codex-runtime-contract.md](/Users/oliver/projects/maestro/docs/codex-runtime-contract.md) for the shared Codex runtime assumptions.
