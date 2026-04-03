---
name: agents-md-sync
description: Generates or updates an AGENTS.md file from existing CLAUDE.md content for Codex compatibility. Use when setting up dual-harness support or syncing after CLAUDE.md changes.
disable-model-invocation: true
---

# AGENTS.md Sync

Generate or update an `AGENTS.md` file from the project's `CLAUDE.md` for OpenAI Codex compatibility.

## Process

1. **Scan for instruction files**
   - Read `CLAUDE.md` at the project root
   - Read any subdirectory `CLAUDE.md` files (e.g., `src/CLAUDE.md`, `app/CLAUDE.md`)
   - Read `CLAUDE.local.md` if it exists (but note it won't be committed — flag items that should be in AGENTS.md but come from local-only sources)

2. **Extract portable content** — keep:
   - Build, test, lint commands
   - Coding conventions and style rules
   - Project structure / directory mapping
   - Development principles
   - Architecture invariants
   - Error diagnostics / red flags
   - Git workflow conventions

3. **Strip Claude-specific content** — remove or adapt:
   - Skill invocation references (`/skill-name`) → describe the workflow in prose or note the skill name for `$skill-name` invocation in Codex
   - Agent references (`.claude/agents/`) → translate to Codex TOML agent format notes, or describe as "specialized review workflows"
   - Hook configurations → Codex has experimental hooks (5 events: SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop) but Claude's richer events (FileChanged, SessionEnd, TaskCompleted, etc.) have no equivalent. Remove those or note as manual steps.
   - Plugin references → remove or translate to Codex plugin format
   - `context: fork`, `user-invocable`, and other Claude frontmatter concepts → remove
   - Auto-memory references → replace with "use AGENTS.md for persistent context, or build a hook-based memory process"
   - Permission rules (allow/ask/deny per tool) → translate to Codex sandbox_mode + approval_policy guidance

4. **Map to AGENTS.md structure**

   ```markdown
   # AGENTS.md

   ## Project Overview
   <!-- From CLAUDE.md header / repository purpose -->

   ## Build & Test
   <!-- Extracted quick-start commands -->

   ## Coding Conventions
   <!-- Style rules, patterns, anti-patterns -->

   ## Architecture
   <!-- Directory structure, module relationships, invariants -->

   ## Development Workflow
   <!-- Git conventions, PR process, testing requirements -->
   <!-- Describe issue pipeline and track workflow in tool-neutral terms -->

   ## Red Flags
   <!-- Stop-immediately patterns from CLAUDE.md -->
   ```

5. **Diff against existing AGENTS.md** (if one exists)
   - Show what would change
   - Ask user to confirm before overwriting

6. **Write AGENTS.md** to project root

7. **Remind user** about Codex config:
   ```
   To also read CLAUDE.md as a fallback, add to .codex/config.toml:
   [project]
   project_doc_fallback_filenames = ["CLAUDE.md"]
   ```
