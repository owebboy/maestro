---
status: reviewed
type: bug
priority: P3
filed: 2026-06-09
---

# Issue: codex/INSTALL.md manual install fails on fresh machines; .mcp.json claim is false

## Summary

The manual install loop symlinks into `~/.agents/skills/` without creating it first, so on a fresh machine every `ln -s` fails — or worse, creates a symlink named `skills` pointing at the first skill. The "MCP config" line in the Differences section also describes a `.mcp.json` packaging path that does not exist in this repo.

## Problem Description

The "Install manually (user-scoped, global)" snippet (INSTALL.md:50-61, loop body 57-60) runs `ln -s "$skill" "$HOME/.agents/skills/$name"` in a loop with no `mkdir -p`. If `~/.agents` exists but `skills/` does not, the first ln creates a symlink named `skills` and subsequent links land inside that skill directory — a broken install a weaker model executes verbatim without noticing. Separately, the "MCP config" bullet (INSTALL.md:105) claims plugin-bundled MCP servers are "packaged via `.mcp.json` and referenced from `.codex-plugin/plugin.json`". The `.mcp.json` file does not exist in this repo, Maestro ships no MCP server, and `.codex-plugin/plugin.json` (which does exist) contains no MCP reference — so the sentence describes packaging that is not present.

## Acceptance Criteria

- [ ] `mkdir -p "$HOME/.agents/skills"` precedes the for-loop
- [ ] The .mcp.json sentence is removed or rewritten to describe actual packaging

## Technical Context

### Affected Files

- `codex/INSTALL.md:57-60` — the manual symlink for-loop; `ln -s "$skill" "$HOME/.agents/skills/$name"` runs with no `mkdir -p` (verified: `grep -n mkdir codex/INSTALL.md` returns nothing). Insert `mkdir -p "$HOME/.agents/skills"` before the loop (after the `git clone` on line 54, inside the same fenced block).
- `codex/INSTALL.md:105` — the "MCP config" bullet in the "Differences from Claude Code" section; the false `.mcp.json` packaging sentence to remove or rewrite. (Issue originally cited "line 10" — stale; the sentence is at line 105.)
- `codex/INSTALL.md:50-61` — the "Install manually (user-scoped, global)" section heading and fenced block containing the loop, for orientation.

Reference facts verified during review:
- No `.mcp.json` exists anywhere in the repo (`find . -name .mcp.json` → empty).
- `.codex-plugin/plugin.json` exists but contains no `mcp` reference (it declares `skills`, `interface`, metadata only). Maestro ships no MCP server. So the claim is wrong on packaging, not because plugin.json is missing.

### Related Tests

No automated test suite (Markdown/Bash repo). Validate by:
- Running the corrected manual-install snippet on a machine where `~/.agents/skills` does not yet exist and confirming each skill symlinks into `~/.agents/skills/<name>/` (not a single `skills` symlink). Clean up with `rm -rf ~/.agents/skills` afterward, or test against a throwaway `$HOME`.
- Re-reading the edited "MCP config" bullet to confirm it no longer references a non-existent `.mcp.json`.
- Optional Sonnet skill verification: have a Sonnet agent execute the snippet verbatim to confirm a weaker model no longer produces the broken `skills` symlink.

### Similar Patterns

- `bin/setup-project` `install_skill_set` (around lines 188-205) is the project-scoped analogue of this loop and already creates its target directory before symlinking — copy that defensive `mkdir -p` ordering into the manual snippet.
- Commit `afba736` "Make Maestro first-class for Codex" and `33cf87a` "Improve Codex skill metadata and add review artifacts" established the current Codex install docs and `.codex-plugin/` packaging; the false `.mcp.json` sentence likely entered with that work.

## Dependencies

- `issues/2026-06-09-detection-doc-portability.md` also edits the same manual symlink loop (`codex/INSTALL.md:57-60`) — it ships `docs/` alongside skills, this issue adds `mkdir -p` and fixes the MCP sentence. The changes are adjacent but non-conflicting; whichever lands second should re-read the loop to avoid a stale-context edit.

## Out of Scope

- Creating an actual `.mcp.json` / MCP server, or adding MCP wiring to `.codex-plugin/plugin.json`. The fix corrects the documentation to match reality, not the other way around.
- Refactoring the other install methods (skills.sh, setup-project, repo-local plugin).

## Notes

Found by the 2026-06-09 cross-LLM review.

Decision for the implementer (not blocking): the Acceptance Criteria allows the MCP sentence to be either removed or rewritten. If rewritten rather than deleted, the replacement must not imply Maestro packages an MCP server (it does not). A safe rewrite keeps only the accurate half — user-scoped MCP servers live in `config.toml` under `[mcp_servers.<name>]` — and drops the plugin-bundled `.mcp.json` clause. This is the only judgement call; no external Codex-docs research is required to verify the in-repo facts above.
