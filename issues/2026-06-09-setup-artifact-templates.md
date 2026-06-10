---
status: reviewed
type: refactor
priority: P3
filed: 2026-06-09
---

# Issue: setup defines templates for one of seven artifacts; index.md contract undocumented

## Summary

setup gives a full template for tracks.md but none for the other six artifacts it generates, and the index.md contract that new-track depends on is undocumented — two models produce two different conductor/ layouts.

## Problem Description

setup `## Artifact Generation` (SKILL.md:59-71) lists seven generated artifacts in a File/Purpose table (product.md, product-guidelines.md, tech-stack.md, workflow.md, index.md, tracks.md, code_styleguides/) with a content template for tracks.md only. new-track (step 6) appends to conductor/index.md assuming a structure setup never specifies. Also: question-count statements are inconsistent, and the resume path has an unhandled edge case. Related finding in new-track: pre-flight does not verify conductor/tracks.md and index.md exist before steps 3 and 6 mutate them.

Verified details from current exploration:

- Only `tracks.md` has a content template (`## tracks.md Format`, SKILL.md:88-111). The other six artifacts get a one-line Purpose and no section list, so each model invents its own layout.
- new-track step 6 (SKILL.md:129) says "Update `conductor/index.md`: add to Active Tracks", but no setup template defines an "Active Tracks" section in index.md — and this repo's own `conductor/index.md` (a real setup output) has Context Documents / Related / Quick Commands sections but NO Active Tracks section. The append target new-track assumes does not exist in practice.
- Question-count inconsistency: the global rule (SKILL.md:22) says "Maximum 5 questions per section", but section headers declare different caps — Section 2 Guidelines `(max 3 questions)` (line 32), Section 4 Workflow `(max 4 questions)` (line 47), Section 5 Style Guides `(max 2 questions)` (line 54).
- Resume edge case: SKILL.md:126 says resume should "verify previously created files still exist" but specifies no action when a file is missing (re-generate? re-ask? abort?).
- new-track pre-flight (SKILL.md:28-31) verifies product.md/tech-stack.md/workflow.md exist, but NOT `conductor/tracks.md` or `conductor/index.md` — yet step 3 (line 55) reads tracks.md for uniqueness and step 6 (lines 128-129) mutates both.

## Acceptance Criteria

- [ ] Each generated artifact has a content template or explicit section list
- [ ] The index.md structure is specified and matches what new-track appends (resolved per option (b): new-track no longer touches index.md, so no "Active Tracks" append target is required)
- [ ] new-track pre-flight verifies (or creates) tracks.md and index.md before mutating them

## Technical Context

### Affected Files

- `skills/setup/SKILL.md:59-71` — `## Artifact Generation` File/Purpose table; the seven artifacts that need templates or section lists.
- `skills/setup/SKILL.md:88-111` — `## tracks.md Format (CRITICAL)`; the ONE existing content template, the model to copy for the other six.
- `skills/setup/SKILL.md:22` — global "Maximum 5 questions per section" rule that contradicts per-section caps.
- `skills/setup/SKILL.md:32,47,54` — Section 2 `(max 3)`, Section 4 `(max 4)`, Section 5 `(max 2)` headers that conflict with line 22.
- `skills/setup/SKILL.md:124-126` — `## Resume` path with the unhandled "file missing on verify" edge case.
- `skills/setup/SKILL.md:113-122` — `## Completion` message; lists `{index,product,product-guidelines,tech-stack,workflow,tracks}.md` and should stay consistent with whatever templates are added.
- `skills/new-track/SKILL.md:26-31` — `## Pre-flight`; verifies product/tech-stack/workflow but not tracks.md or index.md.
- `skills/new-track/SKILL.md:53-55` — Step 3 reads `conductor/tracks.md` for track-ID uniqueness.
- `skills/new-track/SKILL.md:128-129` — Step 6 mutates `conductor/tracks.md` (row append) and `conductor/index.md` ("add to Active Tracks") — the index.md append contract.
- `conductor/index.md` (this repo) — a real setup-generated index.md; has Context Documents / Related / Quick Commands but NO "Active Tracks" section. Concrete evidence of the contract mismatch; can also serve as the canonical index.md template to formalize.
- `conductor/tracks.md` (this repo) — a real setup-generated tracks.md matching the SKILL.md:88-111 template; reference for what a generated artifact looks like.

### Related Tests

This repo has NO automated test suite (Markdown skills + Bash). Validate by:

- Running `/setup` (Claude Code) or `$setup` (Codex) on a scratch greenfield directory and confirming all seven artifacts are generated with the documented structure, then running `/new-track` and confirming step 6's index.md/tracks.md appends land in the sections the templates define.
- Diffing the freshly generated `conductor/index.md` against this repo's existing `conductor/index.md` to confirm the formalized template matches reality.
- Sonnet skill verification on `skills/setup/SKILL.md` and `skills/new-track/SKILL.md` (per repo convention, verification subagents run on Sonnet — the skills' primary consumer).

### Similar Patterns

- `skills/setup/SKILL.md:88-111` (`## tracks.md Format`) — the in-repo model for an artifact content template: fenced markdown block + "Do NOT deviate" contract note. Copy this shape for index.md and the other artifacts.
- `skills/new-track/SKILL.md:59-74` — Step 3 spec.md template; another in-repo example of a fenced artifact template with section list.
- `skills/triage/SKILL.md` (issue template embedded ~lines 87-124) — precedent for skills embedding full artifact templates inline rather than referencing `templates/`. The orphaned-templates-dir decision determines whether to follow this embed pattern or switch to `templates/` references.
- Related commit `d7b6356` "Harden skills: ... edge-case guards" — the most recent hardening pass; this issue is the same class of work (missing templates, pre-flight guards, edge cases) and should match its style.

## Dependencies

- GATED BY `issues/2026-06-09-orphaned-templates-dir.md` — that issue decides whether artifact templates live in `templates/` (made canonical: skills say "copy templates/X" and setup ships them) or are deleted (skills embed templates inline). This issue must add six missing templates and cannot choose WHERE they live until that decision lands. If templates/ is made canonical, the index.md/product.md/etc. templates added here should reference `templates/`; if templates/ is deleted, embed them inline like `## tracks.md Format` already does.

## Out of Scope

- Rewriting the Q&A flow or changing which artifacts setup generates; this issue only adds the missing templates/section lists, documents the index.md contract, and adds the pre-flight guards.

## Notes

Found by the 2026-06-09 cross-LLM review.

OPEN DECISION (for the human): The index.md "Active Tracks" contract is currently inconsistent two ways — new-track step 6 appends to an "Active Tracks" section, but generated index.md files (including this repo's own) have no such section. Resolve by EITHER (a) adding an "Active Tracks" section to the formalized index.md template so new-track has a real append target, OR (b) changing new-track step 6 to stop touching index.md (tracks.md is already the registry; index.md may not need per-track rows). Pick one before implementing; do not implement both.

This issue is blocked on the orphaned-templates-dir decision (see Dependencies) for template placement only — the index.md contract decision above is independent and can be settled here.

**Decision (approved 2026-06-09):** Option (b): stop new-track from touching conductor/index.md — tracks.md is the registry, so no index.md 'Active Tracks' contract is needed. Remove the index.md append from new-track step 6. Still in scope: give setup content templates/section-lists for the other generated artifacts (product.md, tech-stack.md, workflow.md, code_styleguides/), and add a new-track pre-flight check that tracks.md exists before mutating it. Per orphaned-templates-dir = DELETE, these templates live in setup/SKILL.md, not templates/.
