# Detecting Optional Skills

Maestro skills that depend on optional plugins (Superpowers, Elements of Style, code-simplifier, claude-md-management) must detect availability before invoking them. Detection uses multiple signals because Claude Code and Codex expose installed skills differently.

## Detection Procedure

To check if an optional skill is available, check these three signals **in order** and treat the skill as available if **any** signal is positive:

### 1. Available skills list

Scan the available skills listed in the current conversation. In Claude Code this may appear in a system reminder; in Codex it may appear in the skills instructions. Plugin-installed skills often appear with their plugin prefix (e.g., `superpowers:brainstorming`). Project-scoped skills often appear bare (e.g., `brainstorming`). Check both forms.

### 2. Project settings

Read `.claude/settings.json` in the project root when it exists. Check whether `enabledPlugins` contains the plugin identifier:

| Plugin | `enabledPlugins` key |
|--------|---------------------|
| Superpowers | `superpowers@superpowers-marketplace` |
| Elements of Style | `elements-of-style@superpowers-marketplace` |
| code-simplifier | `code-simplifier@claude-plugins-official` |
| claude-md-management | `claude-md-management@claude-plugins-official` |

If the key exists and its value is `true`, the plugin is enabled and its skills are available. This is a Claude Code signal; Codex installs typically rely on the available skills list or project skill directories instead.

### 3. Project skills directories

Check whether either project-scoped skill path exists:

- Claude Code: `.claude/skills/{skill-name}/SKILL.md`
- Codex: `.agents/skills/{skill-name}/SKILL.md`

If either file exists, treat the skill as available.

## Skill Name Reference

| Plugin | Skills provided | Plugin-installed form | Project-scoped form |
|--------|----------------|----------------------|---------------------|
| Superpowers | brainstorming | `superpowers:brainstorming` | `brainstorming` |
| | writing-plans | `superpowers:writing-plans` | `writing-plans` |
| | subagent-driven-development | `superpowers:subagent-driven-development` | `subagent-driven-development` |
| | executing-plans | `superpowers:executing-plans` | `executing-plans` |
| Elements of Style | writing-clearly-and-concisely | `elements-of-style:writing-clearly-and-concisely` | `writing-clearly-and-concisely` |
| code-simplifier | simplify | `code-simplifier:simplify` | `simplify` |
| claude-md-management | revise-claude-md | `claude-md-management:revise-claude-md` | `revise-claude-md` |

## Example

To detect whether Superpowers brainstorming is available:

1. Check if the available skills list includes `superpowers:brainstorming` or `brainstorming`
2. Check if `.claude/settings.json` has `"superpowers@superpowers-marketplace": true` in `enabledPlugins`
3. Check if `.claude/skills/brainstorming/SKILL.md` or `.agents/skills/brainstorming/SKILL.md` exists

If any check is positive, invoke the skill using whichever form was found (prefixed or bare).
