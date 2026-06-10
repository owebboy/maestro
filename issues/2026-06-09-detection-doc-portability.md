---
status: reviewed
type: bug
priority: P2
filed: 2026-06-09
---

# Issue: Detection-procedure links break in installed layouts; doc has two gaps

## Summary

Skills reference `../../docs/detecting-optional-skills.md`, but every documented install path ships only `skills/*`, so the link resolves to a nonexistent path and optional-dependency detection silently degrades on the portable and Codex installs the plugin targets.

## Problem Description

`bin/setup-project` (`install_skill_set`, lines 188-205) and the manual symlink loop in codex/INSTALL.md (lines 57-60) install per-skill directories only; `docs/` never ships. The `--portable`/`--copy` mode (setup-project line 179-181) copies skills but still no docs. From an installed skill, `../../docs/` resolves to `.claude/docs/` or `.agents/docs/`, which never exists. Affected referencing skills: issue-review (lines 25, 48), triage (step 6, line 57), workflow-router (line 35), implement (lines 73, 108, 152), new-track (lines 80, 98), session-wrap-up (lines 24, 70).

The doc itself has two gaps: it never says what to do when all three signals are negative (a weaker model may invoke speculatively, try to install the plugin, or stall), and it covers only Claude Code and Codex with no guidance for other harnesses.

## Acceptance Criteria

- [ ] Each detection reference inlines a one-line summary of the three signals so the doc is an enhancement, not required reading (chosen path: Option A — inline summaries)
- [ ] The doc gains a terminal state: "If no signal is positive, treat the skill as unavailable — use the calling skill's inline fallback; do not install or invoke speculatively"
- [ ] The doc gains one sentence covering harnesses that are neither Claude Code nor Codex
- [ ] Alternatively or additionally: setup-project ships docs/ alongside skills (deferred — Option B not chosen; see Decision note)

## Technical Context

### Affected Files

(Line numbers verified against current HEAD d7b6356; several shifted after the 2026-06-09 hardening commit.)

- `docs/detecting-optional-skills.md` — the linked doc. Detection procedure is the three signals at lines 7-33; "Example" at 47-55. Needs a terminal "no signal positive" state and a non-Claude/non-Codex harness sentence (neither present today).
- `skills/issue-review/SKILL.md:25,48` — links the doc for `brainstorming` (25) and `writing-clearly-and-concisely` (48). Note: this is the file being reviewed here; both lines already carry inline fallbacks in surrounding prose but no inline signal summary.
- `skills/triage/SKILL.md:57` — step 6 links the doc for `writing-clearly-and-concisely`; lines 58-60 already supply an inline fallback ("quick inline pass").
- `skills/workflow-router/SKILL.md:35` — links the doc for Superpowers detection; sentence already states the fallback ("fall back to inline brainstorming and TDD").
- `skills/implement/SKILL.md:73,108,152` — links for `subagent-driven-development`/`executing-plans` (73), `executing-plans` (108, with "If no signal is positive, fall back to the no-Superpowers path"), and `simplify` (152, with general-purpose-agent fallback).
- `skills/new-track/SKILL.md:80,98` — links for `brainstorming` (80) and `writing-plans` (98), both via "[detection procedure]".
- `skills/session-wrap-up/SKILL.md:24,70` — links for `simplify` (24, with general-purpose-agent fallback) and `revise-claude-md` (70, with "review directly" fallback).
- `bin/setup-project:188-205` — `install_skill_set()` iterates only `"$source_root"/*` skill dirs into `.claude/skills`/`.agents/skills` (callers at 209, 215). `SCRIPT_DIR` (line 6) resolves the plugin root, so `$SCRIPT_DIR/docs` is reachable if the docs/ shipping option is chosen. `INSTALL_MODE` copy vs symlink handled in `install_path()` (179-185).
- `codex/INSTALL.md:57-60` — manual global symlink loop (`for skill in ~/.codex/maestro/skills/*/`) ships skills only; same gap as setup-project.

### Related Tests

This repo has NO automated test suite (Markdown skills + Bash). Validate by:

- Running `bin/setup-project --portable /tmp/probe` into a scratch dir and confirming whichever fix is chosen: either each caller resolves without the doc (inline-summary option), or `docs/detecting-optional-skills.md` is present under the installed tree (ship-docs option). Repeat with default symlink mode and with `--codex` (`.agents/skills/`).
- Manually replaying the manual Codex symlink loop from `codex/INSTALL.md` against a scratch `~/.agents/skills` and checking the relative `../../docs/` target exists (or that callers no longer require it).
- Sonnet skill verification on each edited caller skill to confirm the inline signal summary reads as self-sufficient guidance (skills are consumed by Sonnet).

### Similar Patterns

- In-repo model for inline-summary form (issue's suggestion): "Detect `brainstorming` (check, in order: the available-skills list for `superpowers:brainstorming` or `brainstorming`; `.claude/settings.json` enabledPlugins; `.claude/skills/` or `.agents/skills/` directories) — see docs/detecting-optional-skills.md for details."
- Existing inline fallbacks already model the "no signal" behavior the doc's terminal state should formalize: `skills/implement/SKILL.md:108` ("If no signal is positive, fall back to the no-Superpowers path below") and the general-purpose-agent fallbacks at `skills/session-wrap-up/SKILL.md:24` and `skills/implement/SKILL.md:152`.
- Ship-docs model: `install_hooks` in `bin/setup-project` (around lines 341, 368) already copies a non-skills asset tree (`$SCRIPT_DIR/bin/hooks`) into the target — the same shape a docs-shipping step would follow.
- Related commits: `1e02bc0` (added the multi-signal detection doc), `d7b6356` (most recent hardening: added dual-harness refs and sequential fallback — shifted the cited line numbers), `b609118` (setup-project portability work).

## Dependencies

None. Self-contained within this repo. No coordination with other open issues identified.

## Out of Scope

## Notes

Found by the 2026-06-09 cross-LLM review (issue-review, triage, workflow-router, and templates-docs reviewers independently).

OPEN DECISION (for the human — do not let implementation pick silently): two viable approaches, and Acceptance Criteria currently allows either or both ("Alternatively or additionally"):

- **Option A — inline one-line signal summaries in each caller.** Edit all 11 link sites (issue-review 25/48, triage 57, workflow-router 35, implement 73/108/152, new-track 80/98, session-wrap-up 24/70) to inline the three-signal summary so the doc becomes an optional enhancement, not required reading. Robust to any install layout including the manual Codex loop; costs ~11 edits and some duplication. Most callers already carry a behavioral fallback, but none carry the inline signal list.
- **Option B — ship docs/ alongside skills in setup-project.** Add a step so `install_skill_set` (or a sibling) also installs `$SCRIPT_DIR/docs/detecting-optional-skills.md` into the target, modeled on the existing hooks-copy step (setup-project ~341/368). Fixes the `bin/setup-project` install path and the `--portable` copy path, but does NOT fix the manual `codex/INSTALL.md` symlink loop (57-60) unless that loop is also updated, and does not fix ad-hoc installs. The `../../docs/` relative path also assumes a specific install depth.
- Combining both (A for portability + B for richer reference) is permitted by the criteria. Recommend the human pick before implementation; both are recorded so the implementer does not choose unilaterally.

The doc-content gaps (terminal "no signal positive" state + non-Claude/non-Codex harness sentence) are independent of the A/B decision and required by Acceptance Criteria 2 and 3 regardless.

**Decision (approved 2026-06-09):** APPROVED: Option A — inline a one-line signal-detection summary at each of the ~11 caller link sites (so docs/detecting-optional-skills.md becomes enhancement, not required reading); add the doc's terminal 'if no signal is positive, treat the skill as unavailable; use the caller's inline fallback' state and one sentence for harnesses that are neither Claude Code nor Codex. Do NOT ship docs/ via setup-project (option B) for now.
