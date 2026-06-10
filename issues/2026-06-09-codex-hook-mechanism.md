---
status: reviewed
type: chore
priority: P3
filed: 2026-06-09
---

# Issue: Codex hook support is claimed but no executing mechanism is documented

## Summary

session-start-issues.sh declares Codex compatibility and setup-project copies it to `.agents/hooks/`, but no documented Codex mechanism executes hooks from that directory — the claim may be aspirational.

## Problem Description

The hook header (bin/hooks/session-start-issues.sh:4) and setup-project's Codex path (`install_codex_hooks`, now at bin/setup-project:367-378) both assume Codex picks up `.agents/hooks/`. README:166 hedges that Codex hooks are experimental behind `codex_hooks = true`, but nothing documents how the copied script gets registered or invoked — there is no Codex equivalent of `hooks/hooks.json` in the repo (that file is Claude-only: it uses `${CLAUDE_PLUGIN_ROOT}` and Claude event names like `SessionStart`/`PostToolUse`). `install_codex_hooks` copies the script and then only prints "note: enable Codex hooks in your config if they are not already on" (bin/setup-project:376) — it does not register the hook, map it to a Codex event, or verify any mechanism exists. Users on Codex get a file copied into their project that nothing demonstrably runs, and the docs imply it works.

## Acceptance Criteria

- [ ] Verify against current Codex documentation whether and how `.agents/hooks/` scripts execute
- [ ] If a registration step exists, setup-project performs or prints it; if not, README/INSTALL stop claiming the hook works on Codex and setup-project stops copying it (or labels it manual)

## Technical Context

### Affected Files

- `bin/hooks/session-start-issues.sh:4` — header line `# Works in both Claude Code and Codex` is the compatibility claim; the script itself is portable Bash, but nothing here registers it with Codex.
- `bin/setup-project:367-378` — `install_codex_hooks()`; copies `session-start-issues.sh` to `.agents/hooks/` (line 375) and prints a passive note (line 376). This is the function that needs to either perform/print a real registration step or label the copy as manual/experimental.
- `bin/setup-project:380-392` — `install_hooks()` dispatcher; calls `install_codex_hooks` only when `$INSTALL_CODEX`.
- `README.md:164-166` — "Codex" subsection under `## Hooks`; line 166 is the "experimental (`codex_hooks = true`)" claim that says setup-project "copies the compatible hook to `.agents/hooks/`" without stating how it runs. (Issue originally cited 163-164; current location is 164-166 after recent edits.)
- `codex/INSTALL.md:107` — "Hooks" bullet under "Differences from Claude Code"; same unsubstantiated claim that the copied hook is Codex-compatible.
- `codex/INSTALL.md:46` — `--portable`/setup blurb: "copies the compatible Codex hook into `.agents/hooks/`" — second doc surface making the claim.
- `hooks/hooks.json` — the Claude-only registration manifest (`${CLAUDE_PLUGIN_ROOT}`, `SessionStart`/`PostToolUse`); confirms there is NO Codex-side registration file in the repo. This is the model to compare against when deciding what a Codex equivalent would need.

### Related Tests

No automated test suite (Markdown + Bash repo). Validate by:
- Running `bin/setup-project --codex` against a scratch target dir and confirming what actually lands in `.agents/hooks/` and what message is printed (no registration occurs today).
- Manually verifying against current Codex docs whether a script in `.agents/hooks/` is auto-discovered or requires explicit config; the fix is "correct" only if docs/setup-project match the verified mechanism.
- Sonnet skill verification is not applicable (no skill changes) unless the fix touches a skill; this is a script/docs change.

### Similar Patterns

- `hooks/hooks.json` — the working Claude registration model. If Codex needs a registration manifest/config block, this is the in-repo precedent to mirror (Codex-specific format, not this file).
- `bin/setup-project:340-365` `install_claude_hooks()` — sibling that DOES create real registration (`write_claude_settings_with_hooks`, bin/setup-project:298-338). Contrast: the Claude path produces a runnable hook; the Codex path stops at a copy + note. The fix likely makes `install_codex_hooks` parallel (either real registration or an honest manual/experimental label).
- Codex-accuracy cluster issues for shared verification of Codex behavior against current docs: `issues/2026-06-09-agents-md-sync-fixes.md` (already reviewed; same "verify against current Codex docs" pattern, including its note that some hook event names are fabricated) and `issues/2026-06-09-codex-install-fixes.md`.
- Recent hook-related commits: `7bfc97a` "Fix installed hooks and stop shipping personal artifacts" and `d7b6356` "Harden skills: ... dual-harness refs ..." — context for why line numbers shifted and the current state of dual-harness hook claims.

## Dependencies

Part of the Codex-accuracy cluster. Coordinate wording/verification with:
- `issues/2026-06-09-agents-md-sync-fixes.md` — also requires checking Codex hook/config behavior against current docs (and flags fabricated Codex/Claude hook event names); align on the verified hook-event/registration facts so the two issues do not contradict each other.
- `issues/2026-06-09-codex-install-fixes.md` — touches `codex/INSTALL.md`; sequence edits to avoid clobbering overlapping INSTALL.md changes.

## Out of Scope

- Building a full Codex hooks runtime or porting `validate-issue-frontmatter.sh` (Claude-only PostToolUse) to Codex.
- Changing the Claude hook registration path (`install_claude_hooks`, `hooks/hooks.json`).

## Notes

Found by the 2026-06-09 cross-LLM review.

EXTERNAL RESEARCH (human/Codex-docs verification required — do not assert either way): Confirm against CURRENT Codex documentation whether a script placed in `.agents/hooks/` is auto-discovered and executed, and if so by which event/trigger and whether `codex_hooks = true` (or any registration config) is required. The repo contains no Codex registration manifest, only a copied script and a passive note, so today's behavior is unverified. The chosen Acceptance Criteria branch (register vs. stop-claiming/label-manual) depends entirely on this answer — record the finding here before implementation.
