# Markdown Style Guide

Markdown is Maestro's primary authoring language (skills, templates, docs).

## Structure

- One `#` H1 per file, matching the file's purpose.
- Use sentence-case headings.
- Keep skills readable in roughly one screen — prefer tables, checklists, and bullets over long prose.

## Skill frontmatter

- Every `SKILL.md` starts with YAML frontmatter (`name`, `description`, invocation flags).
- Keep `description` a single line that states *what* the skill does and *when* to use it.
- Use `allow_implicit_invocation: false` / `disable-model-invocation` for routing-only, destructive, or session-finalizing skills.
- Keep `SKILL.md` frontmatter aligned with any `agents/openai.yaml` metadata.

## Voice

- Imperative and concise (see `product-guidelines.md`).
- Address the agent directly ("Read X", "Verify Y") rather than narrating.

## Formatting

- Fenced code blocks with a language hint (```bash, ```json).
- Reference files as `path/to/file` in backticks; link with relative paths inside `conductor/`.
- Tables use the existing pipe style with a header separator row.
