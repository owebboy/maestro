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
   - **If no CLAUDE.md exists** (root or subdirectories), stop and tell the user there is nothing to sync — offer to run `/setup` (`$setup` in Codex) or to draft `AGENTS.md` from scratch. Do not invent content.

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
   - Hook configurations → Codex supports lifecycle hooks (on by default, registered via a `hooks.json`): SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop. Claude's additional events (SessionEnd, SubagentStop, PreCompact, Notification) have no Codex equivalent — remove those or note them as manual steps.
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

5. **Merge with existing AGENTS.md** (if one exists)
   - Do NOT regenerate from scratch. Preserve sections that exist only in AGENTS.md (Codex-specific content with no CLAUDE.md source).
   - Show a diff of what would change, and **explicitly flag any section that would be removed** so the user can veto deletions.
   - Ask the user to confirm before writing.

6. **Write AGENTS.md** to project root (after confirmation)

7. **Remind user** about Codex config:
   ```
   To read CLAUDE.md as a fallback when a directory has no AGENTS.md, add this
   top-level key to your global ~/.codex/config.toml (not a [project] table,
   and not a project-local file):
   project_doc_fallback_filenames = ["CLAUDE.md"]
   ```
   Note: this is a fallback only — if AGENTS.md exists it always wins and CLAUDE.md is ignored.
